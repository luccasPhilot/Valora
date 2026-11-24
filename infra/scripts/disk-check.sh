#!/usr/bin/env bash
# Confere o uso do disco da raiz (Docker, volume do PostgreSQL e logs) e do disco dos backups, e
# avisa o healthchecks.io. Disco cheio derruba o PostgreSQL.
#
# Cron do servidor, todo dia às 06:00 (crontab -e):
#   0 6 * * * /home/luccas-philot/Valora/infra/scripts/disk-check.sh >> /var/log/valora-backup.log 2>&1
#
# Variáveis:
#   BACKUP_DIR            pasta dos backups (padrão: /mnt/hdd/valora)
#   HEALTHCHECK_DISK_URL  URL de ping (opcional; lida do infra/.env se não estiver no ambiente)
set -euo pipefail

readonly SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BACKUP_DIR="${BACKUP_DIR:-/mnt/hdd/valora}"
readonly ROOT_PATH="/"
readonly DISK_USAGE_LIMIT_PERCENT=85

# shellcheck source=lib/healthcheck.sh
source "$SCRIPTS_DIR/lib/healthcheck.sh"

# Só caminho e percentual vão para o log.
log() {
  echo "$(date '+%F %T') [disk-check] $*"
}

usage_percent() {
  df -P "$1" | awk 'NR == 2 { sub("%", "", $5); print $5 }'
}

main() {
  local exit_code=0
  local path usage
  for path in "$ROOT_PATH" "$BACKUP_DIR"; do
    usage="$(usage_percent "$path")"
    if ((usage > DISK_USAGE_LIMIT_PERCENT)); then
      log "$path: ${usage}% (ACIMA DO LIMITE de ${DISK_USAGE_LIMIT_PERCENT}%)"
      exit_code=1
    else
      log "$path: ${usage}%"
    fi
  done
  ping_healthcheck "$(healthcheck_url HEALTHCHECK_DISK_URL)" "$exit_code"
  exit "$exit_code"
}

main "$@"
