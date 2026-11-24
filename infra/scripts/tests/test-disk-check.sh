# Testes do disk-check.sh.

readonly DISK_PING_URL="https://hc-ping.com/11111111-1111-4111-8111-111111111111"

disk_curl_calls() {
  grep '^curl ' "$STUB_CALLS" 2>/dev/null || true
}

should_ping_zero_when_usage_is_below_limit() {
  # Arrange
  export HEALTHCHECK_DISK_URL="$DISK_PING_URL"
  export STUB_DISK_USAGE="/=60 $BACKUP_DIR=40"
  # Act
  "$SCRIPTS_DIR/disk-check.sh" >/dev/null
  # Assert
  assert_contains "$(disk_curl_calls)" "$DISK_PING_URL/0"
}

should_ping_zero_when_usage_is_exactly_85() {
  # Arrange
  export HEALTHCHECK_DISK_URL="$DISK_PING_URL"
  export STUB_DISK_USAGE="/=85 $BACKUP_DIR=85"
  # Act
  "$SCRIPTS_DIR/disk-check.sh" >/dev/null
  # Assert
  assert_contains "$(disk_curl_calls)" "$DISK_PING_URL/0"
}

should_ping_failure_and_name_path_when_backup_disk_is_at_86() {
  # Arrange
  export HEALTHCHECK_DISK_URL="$DISK_PING_URL"
  export STUB_DISK_USAGE="/=50 $BACKUP_DIR=86"
  local output exit_code=0
  # Act
  output="$("$SCRIPTS_DIR/disk-check.sh")" || exit_code=$?
  # Assert
  assert_equals "1" "$exit_code" "código de saída"
  assert_contains "$output" "$BACKUP_DIR: 86% (ACIMA DO LIMITE"
  assert_contains "$(disk_curl_calls)" "$DISK_PING_URL/1"
}

should_send_nothing_when_url_is_empty() {
  # Arrange
  export HEALTHCHECK_DISK_URL=""
  # Act
  "$SCRIPTS_DIR/disk-check.sh" >/dev/null
  # Assert
  assert_equals "" "$(disk_curl_calls)" "chamadas ao curl"
}
