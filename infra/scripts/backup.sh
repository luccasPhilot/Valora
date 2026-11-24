#!/usr/bin/env bash
# Backup do banco do Valora (pg_dump em formato custom), com retenção em camadas.
#
# Uso: backup.sh [weekly|predeploy|manual]   (padrão: manual)
#   weekly     o backup de domingo, chamado pelo weekly-backup.sh
#   predeploy  o backup de antes de cada deploy, chamado pelo deploy.sh
#   manual     qualquer outro (antes de restaurar, antes de um teste)
#
# O cron do servidor chama o weekly-backup.sh, que chama este script (veja docs/05-deploy.md):
#   0 3 * * 0 /home/luccas-philot/Valora/infra/scripts/weekly-backup.sh >> /var/log/valora-backup.log 2>&1
#
# Variáveis:
#   BACKUP_DIR  pasta no segundo disco (padrão: /mnt/hdd/valora)
set -euo pipefail

readonly SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BACKUP_DIR="${BACKUP_DIR:-/mnt/hdd/valora}"
readonly COMPOSE_FILE="$SCRIPTS_DIR/../compose.yml"
readonly DEFAULT_ORIGIN="manual"
readonly SECONDS_PER_DAY=86400
readonly WEEKLY_RETENTION_DAYS=56
readonly MONTHLY_RETENTION_DAYS=365
readonly SHORT_RETENTION_DAYS=30
readonly ALWAYS_KEPT_PER_ORIGIN=3

# shellcheck source=lib/backup-files.sh
source "$SCRIPTS_DIR/lib/backup-files.sh"

BACKUP_FILE=""
TEMPORARY_FILE=""

# Só nomes e tamanhos vão para o log; o conteúdo do banco nunca.
log() {
  echo "$(date '+%F %T') [backup] $*"
}

fail() {
  log "ERRO: $*"
  exit 1
}

remove_temporary_file() {
  [[ -z "$TEMPORARY_FILE" ]] || rm -f "$TEMPORARY_FILE"
}

require_valid_origin() {
  local origin="$1"
  is_valid_backup_origin "$origin" || fail "origem '$origin' inválida; use uma de: ${BACKUP_ORIGINS[*]}"
}

dump_database() {
  # Grava em arquivo temporário: um dump pela metade nunca vira backup.
  docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U valora -Fc valora >"$TEMPORARY_FILE"
  [[ -s "$TEMPORARY_FILE" ]] || return 1
}

# Nunca sobrescreve: a checagem pega o caso comum e o `mv -n` fecha a corrida entre os dois. Em
# algumas versões do coreutils o `mv -n` não move e sai com 0, por isso a conferência do .tmp.
move_into_place() {
  [[ ! -e "$BACKUP_FILE" ]] || fail "$(basename "$BACKUP_FILE") já existe; nada foi sobrescrito"
  mv -n "$TEMPORARY_FILE" "$BACKUP_FILE"
  [[ ! -e "$TEMPORARY_FILE" ]] || fail "$(basename "$BACKUP_FILE") já existe; nada foi sobrescrito"
  chmod 600 "$BACKUP_FILE"
}

# Dias inteiros entre a data do nome (AAAA-MM-DD) e hoje.
age_in_days() {
  local day="$1"
  local today_seconds day_seconds
  today_seconds="$(date -u -d "$(date +%F)" +%s)"
  day_seconds="$(date -u -d "$day" +%s)"
  echo $(((today_seconds - day_seconds) / SECONDS_PER_DAY))
}

# Semanal: 8 semanas; depois, só o primeiro semanal de cada mês, por 12 meses.
is_weekly_kept() {
  local age="$1"
  local is_first_of_month="$2"
  ((age <= WEEKLY_RETENTION_DAYS)) && return 0
  [[ "$is_first_of_month" == "yes" ]] && ((age <= MONTHLY_RETENTION_DAYS))
}

is_kept() {
  local origin="$1"
  local key="$2"
  local is_first_of_month="$3"
  local age
  age="$(age_in_days "${key%%_*}")"
  if [[ "$origin" == "weekly" ]]; then
    is_weekly_kept "$age" "$is_first_of_month"
    return
  fi
  ((age <= SHORT_RETENTION_DAYS))
}

# Imprime a chave do primeiro semanal de cada mês, uma por linha.
first_weekly_keys() {
  list_backups "$BACKUP_DIR" | awk '$2 == "weekly" { month = substr($1, 1, 7); if (!(month in seen)) { seen[month] = 1; print $1 } }'
}

apply_retention() {
  local first_keys key origin path is_first
  local -A kept_per_origin=()
  first_keys="$(first_weekly_keys)"
  while read -r key origin path; do
    kept_per_origin[$origin]=$((${kept_per_origin[$origin]:-0} + 1))
    ((kept_per_origin[$origin] <= ALWAYS_KEPT_PER_ORIGIN)) && continue
    grep -qxF "$key" <<<"$first_keys" && is_first="yes" || is_first="no"
    is_kept "$origin" "$key" "$is_first" && continue
    rm -f "$path"
    log "apagado: $(basename "$path")"
  done < <(list_backups "$BACKUP_DIR" | sort -r)
}

main() {
  local origin="${1:-$DEFAULT_ORIGIN}"
  require_valid_origin "$origin"
  umask 077
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/valora-$origin-$(date +%F_%H%M%S).dump"
  TEMPORARY_FILE="$BACKUP_FILE.tmp"
  [[ ! -e "$BACKUP_FILE" ]] || fail "$(basename "$BACKUP_FILE") já existe; nada foi sobrescrito"
  trap remove_temporary_file EXIT

  dump_database || fail "pg_dump falhou; backups antigos mantidos"
  move_into_place
  log "ok: $(basename "$BACKUP_FILE") ($(du -h "$BACKUP_FILE" | cut -f1))"
  apply_retention
}

main "$@"
