# Testes do deploy.sh: o smoke test da imagem nova antes de trocar os containers.
#
# O deploy age sobre o clone em que está (git fetch, checkout), então cada teste monta um repositório
# de mentira (origin + clone) na pasta temporária e roda uma cópia do script lá dentro.

setup_deploy_sandbox() {
  local origin="$TEST_DIR/origin.git"
  DEPLOY_REPO="$TEST_DIR/valora"
  git init -q --bare -b main "$origin"
  git clone -q "$origin" "$DEPLOY_REPO" 2>/dev/null
  git -C "$DEPLOY_REPO" checkout -q -b main
  mkdir -p "$DEPLOY_REPO/infra/scripts"
  cp "$SCRIPTS_DIR/deploy.sh" "$DEPLOY_REPO/infra/scripts/deploy.sh"
  echo "name: valora" >"$DEPLOY_REPO/infra/compose.yml"
  git -C "$DEPLOY_REPO" add -A
  git -C "$DEPLOY_REPO" -c user.name=teste -c user.email=teste@example.com commit -q -m "chore: sandbox"
  git -C "$DEPLOY_REPO" push -q origin main
  echo "POSTGRES_PASSWORD=teste" >"$DEPLOY_REPO/infra/.env"
}

# Roda o deploy no sandbox; devolve a saída e deixa o código de saída em DEPLOY_EXIT_CODE.
run_deploy() {
  setup_deploy_sandbox
  DEPLOY_EXIT_CODE=0
  DEPLOY_OUTPUT="$("$DEPLOY_REPO/infra/scripts/deploy.sh" 2>&1)" || DEPLOY_EXIT_CODE=$?
}

compose_calls() {
  grep '^docker compose ' "$STUB_CALLS" 2>/dev/null || true
}

# Número da primeira chamada ao compose que contém o texto (vazio se não houve).
first_compose_call_number() {
  compose_calls | grep -n -- "$1" | head -n 1 | cut -d: -f1
}

should_not_run_up_when_backend_boot_check_fails() {
  # Arrange
  export STUB_BOOT_CHECK_FAILS=1
  # Act
  run_deploy
  # Assert
  assert_equals "1" "$DEPLOY_EXIT_CODE" "código de saída"
  assert_not_contains "$(compose_calls)" " up "
}

should_not_run_up_when_nginx_test_fails() {
  # Arrange
  export STUB_NGINX_TEST_FAILS=1
  # Act
  run_deploy
  # Assert
  assert_equals "1" "$DEPLOY_EXIT_CODE" "código de saída"
  assert_not_contains "$(compose_calls)" " up "
}

should_run_up_without_build_when_smoke_test_passes() {
  # Arrange
  local build_number boot_check_number nginx_number up_number
  # Act
  run_deploy
  build_number="$(first_compose_call_number ' build')"
  boot_check_number="$(first_compose_call_number 'boot-check.js')"
  nginx_number="$(first_compose_call_number 'nginx -t')"
  up_number="$(first_compose_call_number ' up ')"
  # Assert
  assert_equals "0" "$DEPLOY_EXIT_CODE" "código de saída"
  [[ -n "$build_number" && -n "$boot_check_number" && -n "$nginx_number" && -n "$up_number" ]] \
    || { echo "faltou uma chamada:"; compose_calls; return 1; }
  ((build_number < boot_check_number && boot_check_number < up_number && nginx_number < up_number)) \
    || { echo "ordem errada (build, testes, up):"; compose_calls; return 1; }
  assert_not_contains "$(compose_calls | grep ' up ')" "--build"
}

should_run_smoke_tests_without_database_or_published_ports() {
  # Arrange
  local smoke_calls
  # Act
  run_deploy
  smoke_calls="$(compose_calls | grep -E 'boot-check.js|nginx -t')"
  # Assert
  assert_contains "$smoke_calls" "run --rm -T --no-deps backend node dist/boot-check.js"
  assert_contains "$smoke_calls" "run --rm -T --no-deps frontend nginx -t"
}

should_say_old_containers_keep_running_when_smoke_test_fails() {
  # Arrange
  export STUB_BOOT_CHECK_FAILS=1
  # Act
  run_deploy
  # Assert
  assert_contains "$DEPLOY_OUTPUT" "containers antigos continuam no ar"
}

should_not_leak_environment_values_when_smoke_test_fails() {
  # Arrange
  export STUB_BOOT_CHECK_FAILS=1
  # Act
  run_deploy
  # Assert
  assert_not_contains "$DEPLOY_OUTPUT" "POSTGRES_PASSWORD=teste"
}
