#!/usr/bin/env bash
# Atualiza o Valora no servidor: backup, troca de versão, build, subida e espera dos healthchecks.
#
# Uso, direto no servidor:   ~/Valora/infra/scripts/deploy.sh [ref]
#   ref: branch, tag ou commit (padrão: main). Para voltar versão, passe o commit anterior.
set -euo pipefail

# O clone de produção (com o infra/.env) é a pasta deste repositório, onde quer que esteja.
readonly VALORA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly COMPOSE_FILE="infra/compose.yml"
readonly HEALTHCHECK_TIMEOUT_SECONDS=180
readonly IMAGE_RETENTION_HOURS=168

log() {
  echo "[deploy] $*"
}

fail() {
  echo "[deploy] ERRO: $*" >&2
  exit 1
}

compose() {
  # Um build por vez: dois builds de Node em paralelo sufocam um servidor de 8 GB.
  COMPOSE_PARALLEL_LIMIT=1 docker compose -f "$COMPOSE_FILE" "$@"
}

require_clean_checkout() {
  [[ -f infra/.env ]] || fail "infra/.env não existe em $VALORA_DIR (copie do infra/.env.example)"
  git diff --quiet HEAD || fail "há alterações locais em $VALORA_DIR; o deploy não sobrescreve nada"
}

resolve_target_sha() {
  local ref="$1"
  git fetch --prune --tags origin
  git rev-parse --verify --quiet "origin/${ref}^{commit}" \
    || git rev-parse --verify --quiet "${ref}^{commit}" \
    || fail "não achei '$ref' no repositório"
}

backup_if_database_is_running() {
  # Na primeira subida ainda não existe banco, então não há o que salvar.
  if [[ -z "$(compose ps --status running --quiet db)" ]]; then
    log "banco ainda não está rodando; sem backup"
    return
  fi
  log "backup antes de atualizar (as migrations rodam quando o backend inicia)"
  infra/scripts/backup.sh
}

start_stack() {
  if compose up -d --build --wait --wait-timeout "$HEALTHCHECK_TIMEOUT_SECONDS"; then
    return
  fi
  compose ps || true
  compose logs --tail 30 backend || true
  fail "os containers não ficaram saudáveis. Voltar o código não desfaz migrations já aplicadas: se o banco mudou, restaure o backup mais recente (docs/05-deploy.md)"
}

checkout_target() {
  local ref="$1"
  local target_sha="$2"
  # Branch: o servidor fica nela (um `git pull` manual continua funcionando).
  # Tag ou commit: fica em HEAD solto, que é o esperado ao voltar versão.
  if git show-ref --verify --quiet "refs/remotes/origin/${ref}"; then
    git checkout --quiet -B "$ref" "origin/${ref}"
  else
    git checkout --quiet --detach "$target_sha"
  fi
}

clean_old_images() {
  docker image prune --force >/dev/null
  docker builder prune --force --filter "until=${IMAGE_RETENTION_HOURS}h" >/dev/null
}

main() {
  local ref="${1:-main}"
  local target_sha

  cd "$VALORA_DIR"
  require_clean_checkout
  target_sha="$(resolve_target_sha "$ref")"

  log "versão atual: $(git rev-parse --short HEAD) → nova: ${target_sha:0:7}"
  backup_if_database_is_running
  checkout_target "$ref" "$target_sha"
  start_stack
  clean_old_images

  compose ps
  log "pronto: ${target_sha:0:7} no ar"
}

main "$@"
