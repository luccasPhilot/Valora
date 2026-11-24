#!/usr/bin/env bash
# Roda os testes dos scripts de infra (bash puro, sem dependência).
#
# Uso (Linux ou WSL): bash infra/scripts/tests/run-tests.sh
#
# Cada função `should_*` de cada `test-*.sh` roda numa subshell com uma pasta temporária própria
# e com os comandos de mentira de `stubs/` no começo do PATH (docker, curl, df, date).
set -uo pipefail

readonly TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPTS_DIR="$(cd "$TESTS_DIR/.." && pwd)"
readonly STUBS_DIR="$TESTS_DIR/stubs"

passed=0
failed=0

# Ambiente limpo de cada teste: nada do servidor (URLs de aviso, .env, BACKUP_DIR) vaza para ele.
prepare_test_environment() {
  local test_dir="$1"
  unset HEALTHCHECK_BACKUP_URL HEALTHCHECK_SYNC_URL HEALTHCHECK_DISK_URL
  export SCRIPTS_DIR TEST_DIR="$test_dir"
  export PATH="$STUBS_DIR:$PATH"
  export BACKUP_DIR="$test_dir/backups"
  export VALORA_ENV_FILE="$test_dir/missing.env"
  export STUB_CALLS="$test_dir/stub-calls.log"
  export STUB_RESTORED_FILE="$test_dir/restored.dump"
  export STUB_TODAY="2026-11-22"
  export STUB_NOW="2026-11-22_030000"
  mkdir -p "$BACKUP_DIR"
  cd "$test_dir"
}

run_test() {
  local test_file="$1"
  local test_name="$2"
  local test_dir output status
  test_dir="$(mktemp -d)"
  output="$(
    {
      prepare_test_environment "$test_dir"
      # shellcheck source=assert.sh
      source "$TESTS_DIR/assert.sh"
      # shellcheck disable=SC1090
      source "$test_file"
      set -euo pipefail
      "$test_name"
    } 2>&1
  )"
  status=$?
  rm -rf "$test_dir"
  report "$test_file" "$test_name" "$status" "$output"
}

report() {
  local test_file="$1" test_name="$2" status="$3" output="$4"
  if ((status == 0)); then
    passed=$((passed + 1))
    echo "  ok    $(basename "$test_file") › $test_name"
    return
  fi
  failed=$((failed + 1))
  echo "  FALHA $(basename "$test_file") › $test_name"
  sed 's/^/        /' <<<"$output"
}

test_names_of() {
  bash -c "source '$TESTS_DIR/assert.sh'; source '$1'; declare -F" | awk '$3 ~ /^should_/ { print $3 }'
}

main() {
  local test_file test_name
  for test_file in "$TESTS_DIR"/test-*.sh; do
    for test_name in $(test_names_of "$test_file"); do
      run_test "$test_file" "$test_name"
    done
  done
  echo
  echo "$passed passaram, $failed falharam"
  ((failed == 0))
}

main "$@"
