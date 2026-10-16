#!/usr/bin/env bash
set -euo pipefail

readonly CONFIG_DIR_NAME=".config/bazzite-bluetooth-fix"
readonly USER_BIN_DIR_NAME=".local/bin"
readonly USER_UNIT_DIR_NAME=".config/systemd/user"
readonly SERVICE_NAME="bazzite-bt-autoconnect.service"

if [[ "${EUID}" -eq 0 ]]; then
    printf 'Erro: execute este instalador como o usuário do Decky, sem sudo.\n' >&2
    exit 1
fi

if [[ -z "${HOME:-}" || "${HOME}" != /* || "${HOME}" == "/" ]]; then
    printf 'Erro: HOME não aponta para uma pasta pessoal válida.\n' >&2
    exit 1
fi

if ! command -v systemctl >/dev/null 2>&1 || ! command -v bluetoothctl >/dev/null 2>&1; then
    printf 'Erro: systemctl e bluetoothctl precisam estar instalados.\n' >&2
    exit 1
fi

if ! systemctl --user show-environment >/dev/null 2>&1; then
    printf 'Erro: o systemd de usuário não está disponível nesta sessão.\n' >&2
    exit 1
fi

CONFIG_DIR="${HOME}/${CONFIG_DIR_NAME}"
DEVICES_FILE="${CONFIG_DIR}/devices.txt"
USER_BIN_DIR="${HOME}/${USER_BIN_DIR_NAME}"
USER_UNIT_DIR="${HOME}/${USER_UNIT_DIR_NAME}"
PROGRAM_FILE="${USER_BIN_DIR}/bazzite-bt-autoconnect"
SERVICE_FILE="${USER_UNIT_DIR}/${SERVICE_NAME}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_program="${script_dir}/bazzite-bt-autoconnect"
source_service="${script_dir}/bazzite-bt-autoconnect.service"

if [[ ! -f "${source_program}" || ! -f "${source_service}" ]]; then
    printf 'Erro: faltam os arquivos do serviço em %s\n' "${script_dir}" >&2
    exit 1
fi

for path in \
    "${HOME}/.config" \
    "${CONFIG_DIR}" \
    "${HOME}/.local" \
    "${USER_BIN_DIR}" \
    "${HOME}/.config/systemd" \
    "${USER_UNIT_DIR}"; do
    if [[ -L "${path}" ]]; then
        printf 'Erro: recusando instalar através de diretório simbólico: %s\n' "${path}" >&2
        exit 1
    fi
done

install -d -m 0750 "${CONFIG_DIR}"
if [[ -L "${DEVICES_FILE}" ]]; then
    printf 'Erro: %s não pode ser um link simbólico.\n' "${DEVICES_FILE}" >&2
    exit 1
elif [[ ! -e "${DEVICES_FILE}" ]]; then
    install -m 0640 /dev/null "${DEVICES_FILE}"
elif [[ ! -f "${DEVICES_FILE}" ]]; then
    printf 'Erro: %s precisa ser um arquivo normal, não um link ou diretório.\n' "${DEVICES_FILE}" >&2
    exit 1
fi
chmod 0640 "${DEVICES_FILE}"

install -d -m 0755 "${USER_BIN_DIR}" "${USER_UNIT_DIR}"
for path in "${PROGRAM_FILE}" "${SERVICE_FILE}"; do
    if [[ -L "${path}" ]]; then
        printf 'Erro: recusando instalar através de arquivo simbólico: %s\n' "${path}" >&2
        exit 1
    fi
done
install -m 0755 "${source_program}" "${PROGRAM_FILE}"
install -m 0644 "${source_service}" "${SERVICE_FILE}"

systemctl --user daemon-reload
systemctl --user enable --now "${SERVICE_NAME}"
systemctl --user --no-pager --full status "${SERVICE_NAME}"

printf '\nInstalado no userspace. Lista de dispositivos: %s\n' "${DEVICES_FILE}"
