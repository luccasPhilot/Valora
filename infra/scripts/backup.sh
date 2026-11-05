#!/usr/bin/env bash
# Backup diário do banco do Valora (pg_dump em formato custom), com retenção de 30 dias.
#
# Cron do servidor, todo dia às 03:00 (crontab -e):
#   0 3 * * * /home/luccas-philot/valora/infra/scripts/backup.sh >> /var/log/valora-backup.log 2>&1
#
# Variáveis:
#   BACKUP_DIR  pasta no segundo disco (padrão: /mnt/backup/valora)
set -euo pipefail

readonly BACKUP_DIR="${BACKUP_DIR:-/mnt/backup/valora}"
readonly RETENTION_DAYS=30
readonly COMPOSE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/compose.yml"
readonly BACKUP_FILE="$BACKUP_DIR/valora-$(date +%F).dump"
readonly TEMPORARY_FILE="$BACKUP_FILE.tmp"

# Só nomes e tamanhos vão para o log; o conteúdo do banco nunca.
log() {
  echo "$(date '+%F %T') [backup] $*"
}

remove_temporary_file() {
  rm -f "$TEMPORARY_FILE"
}

dump_database() {
  # Grava em arquivo temporário: um dump pela metade nunca vira "backup do dia".
  docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U valora -Fc valora >"$TEMPORARY_FILE"
  [[ -s "$TEMPORARY_FILE" ]] || return 1
}

delete_expired_backups() {
  find "$BACKUP_DIR" -maxdepth 1 -name 'valora-*.dump' -mtime +"$RETENTION_DAYS" -print -delete \
    | sed 's/^/[backup] apagado: /'
}

main() {
  mkdir -p "$BACKUP_DIR"
  trap remove_temporary_file EXIT

  if ! dump_database; then
    log "ERRO: pg_dump falhou; backups antigos mantidos"
    exit 1
  fi

  mv "$TEMPORARY_FILE" "$BACKUP_FILE"
  log "ok: $(basename "$BACKUP_FILE") ($(du -h "$BACKUP_FILE" | cut -f1))"
  delete_expired_backups
}

main
