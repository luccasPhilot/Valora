# Nomes dos backups do Valora. Carregado com `source` pelo backup.sh e pelo restore-check.sh.
#
# Formatos reconhecidos:
#   valora-<origem>-AAAA-MM-DD_HHMMSS.dump   origem: weekly, predeploy ou manual
#   valora-AAAA-MM-DD.dump                   formato antigo: conta como weekly, às 00:00:00
# Qualquer outro nome é ignorado: nunca é apagado nem escolhido para restaurar.
#
# A data e a hora do nome são a fonte da verdade (o mtime muda se o arquivo for copiado).

readonly BACKUP_ORIGINS=(weekly predeploy manual)
readonly LEGACY_BACKUP_ORIGIN="weekly"
readonly LEGACY_BACKUP_TIME="000000"

# Imprime "<origem> <chave>" de um backup reconhecido; nada para outros nomes.
# A chave (AAAA-MM-DD_HHMMSS) ordena os backups do mais antigo para o mais novo.
backup_file_info() {
  local name
  name="$(basename "$1")"
  if [[ "$name" =~ ^valora-(weekly|predeploy|manual)-([0-9]{4}-[0-9]{2}-[0-9]{2})_([0-9]{6})\.dump$ ]]; then
    echo "${BASH_REMATCH[1]} ${BASH_REMATCH[2]}_${BASH_REMATCH[3]}"
  elif [[ "$name" =~ ^valora-([0-9]{4}-[0-9]{2}-[0-9]{2})\.dump$ ]]; then
    echo "$LEGACY_BACKUP_ORIGIN ${BASH_REMATCH[1]}_${LEGACY_BACKUP_TIME}"
  fi
}

# Lista os backups reconhecidos de uma pasta como "<chave> <origem> <caminho>", do mais antigo
# para o mais novo.
list_backups() {
  local directory="$1"
  local path info origin key
  for path in "$directory"/valora-*.dump; do
    [[ -f "$path" ]] || continue
    info="$(backup_file_info "$path")"
    [[ -n "$info" ]] || continue
    read -r origin key <<<"$info"
    echo "$key $origin $path"
  done | sort
}

is_valid_backup_origin() {
  local candidate="$1"
  local origin
  for origin in "${BACKUP_ORIGINS[@]}"; do
    [[ "$candidate" == "$origin" ]] && return 0
  done
  return 1
}
