import asyncio
import fcntl
import os
import re
import stat
import subprocess
import time
from typing import Dict, List, Optional

import decky


DEVICES_FILE = os.path.join(
    os.path.expanduser("~"),
    ".config",
    "bazzite-bluetooth-fix",
    "devices.txt",
)
MAC_PATTERN = re.compile(r"^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$")
DEVICE_LINE_PATTERN = re.compile(
    r"^\s*Device\s+((?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2})(?:\s+(.*))?$"
)
SCAN_DURATION_SECONDS = 8
BLUETOOTHCTL_TIMEOUT_SECONDS = 8


def _normalize_mac(address: str) -> str:
    normalized = address.strip().upper()
    if not MAC_PATTERN.fullmatch(normalized):
        raise ValueError("Endereço MAC inválido.")
    return normalized


def _open_address_file(path: str, flags: int) -> int:
    flags |= getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(path, flags)
    if not stat.S_ISREG(os.fstat(descriptor).st_mode):
        os.close(descriptor)
        raise OSError("{} não é um arquivo normal.".format(os.path.basename(path)))
    return descriptor


def _parse_device_file(contents: str) -> List[str]:
    addresses = set()
    for raw_line in contents.splitlines():
        candidate = raw_line.strip().upper()
        if not candidate or candidate.startswith("#"):
            continue
        if MAC_PATTERN.fullmatch(candidate):
            addresses.add(candidate)
        else:
            decky.logger.warning("Ignorando uma linha inválida em devices.txt")
    return sorted(addresses)


def _read_addresses(path: str) -> List[str]:
    descriptor = _open_address_file(path, os.O_RDONLY)
    with os.fdopen(descriptor, "r", encoding="utf-8") as devices_file:
        return _parse_device_file(devices_file.read())


def _update_addresses(
    path: str,
    add: Optional[str] = None,
    remove: Optional[str] = None,
) -> List[str]:
    descriptor = _open_address_file(path, os.O_RDWR)
    with os.fdopen(descriptor, "r+", encoding="utf-8") as devices_file:
        fcntl.flock(devices_file.fileno(), fcntl.LOCK_EX)
        devices_file.seek(0)
        addresses = set(_parse_device_file(devices_file.read()))

        if add is not None:
            addresses.add(_normalize_mac(add))
        if remove is not None:
            addresses.discard(_normalize_mac(remove))

        result = sorted(addresses)
        devices_file.seek(0)
        devices_file.write("".join(address + "\n" for address in result))
        devices_file.truncate()
        devices_file.flush()
        os.fsync(devices_file.fileno())
        return result


def _remove_device(address: str) -> List[str]:
    address = _normalize_mac(address)
    _run_bluetoothctl("remove", address)
    return _update_addresses(DEVICES_FILE, remove=address)


def _run_bluetoothctl(*arguments: str, timeout: int = BLUETOOTHCTL_TIMEOUT_SECONDS) -> str:
    completed = subprocess.run(
        ["bluetoothctl", *arguments],
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise RuntimeError(
            "bluetoothctl {} falhou{}".format(
                " ".join(arguments),
                ": " + detail if detail else "",
            )
        )
    return completed.stdout


def _parse_info(info: str) -> Dict[str, str]:
    properties: Dict[str, str] = {}
    for line in info.splitlines():
        if ":" not in line:
            continue
        key, value = line.strip().split(":", 1)
        properties[key.strip().lower()] = value.strip()
    return properties


def _scan_devices() -> List[Dict[str, object]]:
    _run_bluetoothctl("power", "on")
    _run_bluetoothctl(
        "--timeout",
        str(SCAN_DURATION_SECONDS),
        "scan",
        "on",
        timeout=SCAN_DURATION_SECONDS + 5,
    )

    output = _run_bluetoothctl("devices")
    devices: Dict[str, Dict[str, object]] = {}
    for line in output.splitlines():
        match = DEVICE_LINE_PATTERN.match(line)
        if match:
            address = _normalize_mac(match.group(1))
            devices[address] = {
                "address": address,
                "name": (match.group(2) or address).strip(),
                "paired": False,
                "connected": False,
            }

    paired_output = _run_bluetoothctl("devices", "Paired")
    for line in paired_output.splitlines():
        match = DEVICE_LINE_PATTERN.match(line)
        if match:
            address = _normalize_mac(match.group(1))
            devices.setdefault(
                address,
                {
                    "address": address,
                    "name": (match.group(2) or address).strip(),
                    "paired": False,
                    "connected": False,
                },
            )

    for address, device in devices.items():
        try:
            properties = _parse_info(_run_bluetoothctl("info", address))
        except (RuntimeError, subprocess.TimeoutExpired) as error:
            decky.logger.warning(
                "Não foi possível consultar o dispositivo {}: {}".format(address, error)
            )
            continue
        device["name"] = properties.get("alias") or properties.get("name") or device["name"]
        device["paired"] = properties.get("paired", "").lower() == "yes"
        device["connected"] = properties.get("connected", "").lower() == "yes"

    return sorted(devices.values(), key=lambda device: str(device["name"]).casefold())


def _pair_with_agent(address: str) -> str:
    process = subprocess.Popen(
        ["bluetoothctl"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if process.stdin is None:
        process.kill()
        raise RuntimeError("Não foi possível iniciar a sessão de pareamento BlueZ.")

    process.stdin.write(
        "agent KeyboardDisplay\ndefault-agent\npair {}\n".format(address)
    )
    process.stdin.flush()
    deadline = time.monotonic() + 30

    try:
        while time.monotonic() < deadline and process.poll() is None:
            try:
                properties = _parse_info(_run_bluetoothctl("info", address))
            except (RuntimeError, subprocess.TimeoutExpired):
                properties = {}
            if properties.get("paired", "").lower() == "yes":
                break
            time.sleep(0.5)

        process.stdin.write("quit\n")
        process.stdin.flush()
        output, _ = process.communicate(timeout=5)
    except Exception:
        process.kill()
        process.communicate()
        raise

    if process.returncode != 0:
        raise RuntimeError("Falha no pareamento via BlueZ: {}".format(output.strip()))
    return output


def _pair_and_connect(address: str) -> List[str]:
    address = _normalize_mac(address)
    properties = _parse_info(_run_bluetoothctl("info", address))
    if properties.get("paired", "").lower() != "yes":
        pairing_output = _pair_with_agent(address)
        properties = _parse_info(_run_bluetoothctl("info", address))
        if properties.get("paired", "").lower() != "yes":
            raise RuntimeError(
                "O BlueZ não confirmou o pareamento{}".format(
                    ": " + pairing_output.strip() if pairing_output.strip() else ""
                )
            )

    _run_bluetoothctl("trust", address)
    output = _run_bluetoothctl("connect", address, timeout=30)
    properties = _parse_info(_run_bluetoothctl("info", address))
    if properties.get("connected", "").lower() != "yes":
        detail = output.strip()
        raise RuntimeError(
            "O BlueZ não confirmou a conexão{}".format(
                ": " + detail if detail else ""
            )
        )

    return _update_addresses(DEVICES_FILE, add=address)


class Plugin:
    async def _main(self) -> None:
        decky.logger.info("Integração Bluetooth BlueZ inicializada")

    async def _unload(self) -> None:
        pass

    async def get_devices(self) -> List[str]:
        return await asyncio.to_thread(_read_addresses, DEVICES_FILE)

    async def scan_devices(self) -> List[Dict[str, object]]:
        return await asyncio.to_thread(_scan_devices)

    async def pair_and_connect(self, address: str) -> List[str]:
        return await asyncio.to_thread(_pair_and_connect, address)

    async def remove_device(self, address: str) -> List[str]:
        return await asyncio.to_thread(_remove_device, address)

    async def _uninstall(self) -> None:
        await self._unload()
