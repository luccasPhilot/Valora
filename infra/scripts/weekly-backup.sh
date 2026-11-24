#!/usr/bin/env bash
# Rotina de domingo: backup semanal, conferência da restauração e aviso ao healthchecks.io.
#
# Cron do servidor, todo domingo às 03:00 (crontab -e; o cron não expande ~):
#   0 3 * * 0 /home/luccas-philot/Valora/infra/scripts/weekly-backup.sh >> /var/log/valora-backup.log 2>&1
#
# Variáveis:
#   BACKUP_DIR              pasta dos backups (padrão: /mnt/hdd/valora)
#   HEALTHCHECK_BACKUP_URL  URL de ping (opcional; lida do infra/.env se não estiver no ambiente)
set -euo pipefail

readonly SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=lib/healthcheck.sh
source "$SCRIPTS_DIR/lib/healthcheck.sh"

log() {
  echo "$(date '+%F %T') [weekly-backup] $*"
}

main() {
  local exit_code=0
  "$SCRIPTS_DIR/backup.sh" weekly || exit_code=$?
  if ((exit_code == 0)); then
    # O restore-check roda logo depois do dump: o banco em uso não mudou e as quantidades batem.
    "$SCRIPTS_DIR/restore-check.sh" || exit_code=$?
  else
    log "restore-check pulado: o backup falhou"
  fi
  ping_healthcheck "$(healthcheck_url HEALTHCHECK_BACKUP_URL)" "$exit_code"
  exit "$exit_code"
}

main "$@"
