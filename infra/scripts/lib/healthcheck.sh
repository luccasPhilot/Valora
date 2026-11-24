# Avisos para o healthchecks.io. Carregado com `source` pelo weekly-backup.sh e pelo disk-check.sh.
#
# O aviso leva só o código de saída (<url>/0 = ok, <url>/<n> = falha), nunca dados do banco.
# A URL é segredo (quem a tem manda sinais falsos): nunca vai para o log.
#
# Variáveis:
#   VALORA_ENV_FILE  .env de onde ler as URLs (padrão: infra/.env)

readonly DEFAULT_VALORA_ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.env"
readonly HEALTHCHECK_URL_PREFIX="https://"
readonly PING_TIMEOUT_SECONDS=10
readonly PING_RETRIES=2

healthcheck_log() {
  echo "$(date '+%F %T') [healthcheck] $*"
}

# Lê só a linha da variável no .env. O arquivo nunca é carregado com `source`: não executa nada
# nem traz as credenciais do Pluggy e do banco para o ambiente do script.
read_env_file_value() {
  local name="$1"
  local env_file="${VALORA_ENV_FILE:-$DEFAULT_VALORA_ENV_FILE}"
  [[ -f "$env_file" ]] || return 0
  sed -n "s/^${name}=//p" "$env_file" | tail -n 1 | tr -d '\r"'"'"
}

# Imprime a URL de ping de <NOME>: a variável de ambiente, se existir; senão a linha do .env.
# Um valor que não começa com https:// é ignorado (imprime vazio).
healthcheck_url() {
  local name="$1"
  local value
  if [[ -n "${!name+set}" ]]; then
    value="${!name}"
  else
    value="$(read_env_file_value "$name")"
  fi
  if [[ -n "$value" && "$value" != "$HEALTHCHECK_URL_PREFIX"* ]]; then
    healthcheck_log "$name ignorada: a URL precisa começar com $HEALTHCHECK_URL_PREFIX" >&2
    value=""
  fi
  echo "$value"
}

# Avisa o resultado. Nunca falha: um aviso que não sai vira só uma linha no log.
ping_healthcheck() {
  local url="$1"
  local exit_code="$2"
  local curl_status=0
  if [[ -z "$url" ]]; then
    healthcheck_log "aviso desligado (sem URL)"
    return 0
  fi
  curl -fs --max-time "$PING_TIMEOUT_SECONDS" --retry "$PING_RETRIES" -o /dev/null \
    "$url/$exit_code" 2>/dev/null || curl_status=$?
  if ((curl_status == 0)); then
    healthcheck_log "aviso enviado (código $exit_code)"
  else
    healthcheck_log "AVISO: não foi possível avisar o healthchecks.io (curl saiu com $curl_status)"
  fi
  return 0
}
