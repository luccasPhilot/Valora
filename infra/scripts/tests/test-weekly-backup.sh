# Testes do weekly-backup.sh: backup, restore-check e aviso ao healthchecks.io.

readonly PING_URL="https://hc-ping.com/00000000-0000-4000-8000-000000000000"

curl_calls() {
  grep '^curl ' "$STUB_CALLS" 2>/dev/null || true
}

should_ping_zero_when_backup_and_restore_check_pass() {
  # Arrange
  export HEALTHCHECK_BACKUP_URL="$PING_URL"
  # Act
  "$SCRIPTS_DIR/weekly-backup.sh" >/dev/null
  # Assert
  assert_contains "$(curl_calls)" "$PING_URL/0"
}

should_ping_failure_and_skip_restore_check_when_backup_fails() {
  # Arrange
  export HEALTHCHECK_BACKUP_URL="$PING_URL"
  export STUB_DUMP_FAILS=1
  # Act
  assert_exit_code 1 "$SCRIPTS_DIR/weekly-backup.sh"
  # Assert
  assert_contains "$(curl_calls)" "$PING_URL/1"
  assert_not_contains "$(cat "$STUB_CALLS")" "pg_restore"
}

should_ping_failure_when_restore_check_diverges() {
  # Arrange
  export HEALTHCHECK_BACKUP_URL="$PING_URL"
  export STUB_RESTORED_COUNT_balance_snapshots=3
  # Act
  assert_exit_code 1 "$SCRIPTS_DIR/weekly-backup.sh"
  # Assert
  assert_contains "$(curl_calls)" "$PING_URL/1"
}

should_send_nothing_when_url_is_empty() {
  # Arrange
  export HEALTHCHECK_BACKUP_URL=""
  # Act
  "$SCRIPTS_DIR/weekly-backup.sh" >/dev/null
  # Assert
  assert_equals "" "$(curl_calls)" "chamadas ao curl"
}

should_read_url_from_env_file_when_variable_is_not_set() {
  # Arrange
  printf 'PLUGGY_CLIENT_ID=nao-deve-vazar\nHEALTHCHECK_BACKUP_URL=%s\n' "$PING_URL" >"$VALORA_ENV_FILE"
  # Act
  "$SCRIPTS_DIR/weekly-backup.sh" >/dev/null
  # Assert
  assert_contains "$(curl_calls)" "$PING_URL/0"
}

should_ignore_url_when_it_is_not_https() {
  # Arrange
  export HEALTHCHECK_BACKUP_URL="http://hc-ping.com/inseguro"
  # Act
  "$SCRIPTS_DIR/weekly-backup.sh" >/dev/null 2>&1
  # Assert
  assert_equals "" "$(curl_calls)" "chamadas ao curl"
}

should_keep_backup_exit_code_when_ping_fails() {
  # Arrange
  export HEALTHCHECK_BACKUP_URL="$PING_URL"
  export STUB_CURL_FAILS=1
  # Act
  assert_exit_code 0 "$SCRIPTS_DIR/weekly-backup.sh"
  # Assert
  assert_file_exists "$BACKUP_DIR/valora-weekly-$STUB_NOW.dump"
}

should_never_print_ping_url_in_log() {
  # Arrange
  export HEALTHCHECK_BACKUP_URL="$PING_URL"
  export STUB_CURL_FAILS=1
  local output
  # Act
  output="$("$SCRIPTS_DIR/weekly-backup.sh" 2>&1)"
  # Assert
  assert_not_contains "$output" "hc-ping.com"
}
