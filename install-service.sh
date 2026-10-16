#!/usr/bin/env bash
set -euo pipefail

readonly CONFIG_DIR="/home/deck/.config/bazzite-bluetooth-fix"
readonly DEVICES_FILE="${CONFIG_DIR}/devices.txt"
readonly SERVICE_FILE="/etc/systemd/system/bazzite-bt-autoconnect.service"
readonly PROGRAM_FILE="/etc/bazzite-bt-autoconnect"

if [[ "${EUID}" -ne 0 ]]; then
    script_path="$(readlink -f -- "${BASH_SOURCE[0]}")"
    exec sudo -- "${script_path}" "$@"
fi

if ! getent passwd deck >/dev/null; then
    printf 'Erro: o usuário deck não existe neste sistema.\n' >&2
    exit 1
fi

if ! command -v systemctl >/dev/null 2>&1 || ! command -v bluetoothctl >/dev/null 2>&1; then
    printf 'Erro: systemctl e bluetoothctl precisam estar instalados.\n' >&2
    exit 1
fi

deck_uid="$(id -u deck)"
deck_gid="$(id -g deck)"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_program="${script_dir}/bazzite-bt-autoconnect"
source_service="${script_dir}/bazzite-bt-autoconnect.service"

if [[ ! -f "${source_program}" || ! -f "${source_service}" ]]; then
    printf 'Erro: faltam os arquivos do serviço em %s\n' "${script_dir}" >&2
    exit 1
fi

for path in /home/deck /home/deck/.config "${CONFIG_DIR}"; do
    if [[ -L "${path}" ]]; then
        printf 'Erro: recusando instalar através de diretório simbólico: %s\n' "${path}" >&2
        exit 1
    fi
done

install -d -o "${deck_uid}" -g "${deck_gid}" -m 0750 "${CONFIG_DIR}"
if [[ -L "${DEVICES_FILE}" ]]; then
    printf 'Erro: %s não pode ser um link simbólico.\n' "${DEVICES_FILE}" >&2
    exit 1
elif [[ ! -e "${DEVICES_FILE}" ]]; then
    install -o "${deck_uid}" -g "${deck_gid}" -m 0640 /dev/null "${DEVICES_FILE}"
elif [[ ! -f "${DEVICES_FILE}" ]]; then
    printf 'Erro: %s precisa ser um arquivo normal, não um link ou diretório.\n' "${DEVICES_FILE}" >&2
    exit 1
fi
chown "${deck_uid}:${deck_gid}" "${DEVICES_FILE}"
chmod 0640 "${DEVICES_FILE}"

install -D -o root -g root -m 0755 "${source_program}" "${PROGRAM_FILE}"
install -D -o root -g root -m 0644 "${source_service}" "${SERVICE_FILE}"

systemctl daemon-reload
systemctl enable --now bazzite-bt-autoconnect.service
systemctl --no-pager --full status bazzite-bt-autoconnect.service

printf '\nInstalado. Lista de dispositivos: %s\n' "${DEVICES_FILE}"
