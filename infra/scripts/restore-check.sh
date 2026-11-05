#!/usr/bin/env bash
# Prova que o último backup restaura: restaura num banco temporário, compara as quantidades
# de linhas das tabelas principais com o banco em uso e apaga o banco temporário.
# Rode logo depois de um backup; dados novos gravados depois dele fazem as quantidades divergirem.
#
# Variáveis:
#   BACKUP_DIR  pasta dos backups (padrão: /mnt/hdd/valora)
set -euo pipefail

readonly BACKUP_DIR="${BACKUP_DIR:-/mnt/hdd/valora}"
readonly COMPOSE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/compose.yml"
readonly CHECK_DATABASE="valora_restore_check"
readonly CHECKED_TABLES=(transactions accounts categories)

log() {
  echo "[restore-check] $*"
}

database_psql() {
  docker compose -f "$COMPOSE_FILE" exec -T -e PGOPTIONS='--client-min-messages=warning' db \
    psql -U valora -v ON_ERROR_STOP=1 -tA "$@"
}

count_rows() {
  local database="$1"
  local table="$2"
  database_psql -d "$database" -c "SELECT count(*) FROM $table"
}

latest_backup() {
  local latest
  latest="$(find "$BACKUP_DIR" -maxdepth 1 -name 'valora-*.dump' | sort | tail -n 1)"
  # No stderr: a saída desta função é capturada por main.
  [[ -n "$latest" ]] || { log "ERRO: nenhum backup em $BACKUP_DIR" >&2; exit 1; }
  echo "$latest"
}

drop_check_database() {
  database_psql -d postgres -c "DROP DATABASE IF EXISTS $CHECK_DATABASE" >/dev/null
}

compare_tables() {
  local table live restored
  local mismatches=0
  for table in "${CHECKED_TABLES[@]}"; do
    live="$(count_rows valora "$table")"
    restored="$(count_rows "$CHECK_DATABASE" "$table")"
    if [[ "$live" == "$restored" ]]; then
      log "$table: $restored linhas (confere)"
    else
      log "$table: banco em uso $live, backup $restored (DIVERGE)"
      mismatches=$((mismatches + 1))
    fi
  done
  return "$mismatches"
}

main() {
  local backup_file
  backup_file="$(latest_backup)"
  log "restaurando $(basename "$backup_file") em $CHECK_DATABASE"

  trap drop_check_database EXIT
  drop_check_database
  database_psql -d postgres -c "CREATE DATABASE $CHECK_DATABASE" >/dev/null
  docker compose -f "$COMPOSE_FILE" exec -T db \
    pg_restore -U valora -d "$CHECK_DATABASE" --no-owner --exit-on-error <"$backup_file"

  if compare_tables; then
    log "OK: o backup restaura e as quantidades batem"
  else
    log "ERRO: as quantidades divergem (se houve dados novos depois do backup, rode um backup e confira de novo)"
    exit 1
  fi
}

main
