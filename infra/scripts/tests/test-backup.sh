# Testes do backup.sh: nome com origem e hora, e nunca sobrescrever.

should_name_backup_with_origin_and_time_when_origin_is_weekly() {
  # Arrange
  export STUB_NOW="2026-11-22_030001"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_exists "$BACKUP_DIR/valora-weekly-2026-11-22_030001.dump"
}

should_use_manual_origin_when_no_argument_is_given() {
  # Arrange
  export STUB_NOW="2026-11-22_101500"
  # Act
  "$SCRIPTS_DIR/backup.sh"
  # Assert
  assert_file_exists "$BACKUP_DIR/valora-manual-2026-11-22_101500.dump"
}

should_fail_without_dump_when_origin_is_unknown() {
  # Arrange
  local exit_code=0
  # Act
  "$SCRIPTS_DIR/backup.sh" daily >/dev/null 2>&1 || exit_code=$?
  # Assert
  assert_equals "1" "$exit_code" "código de saída"
  assert_not_contains "$(cat "$STUB_CALLS" 2>/dev/null)" "pg_dump"
}

should_keep_existing_file_when_name_is_already_taken() {
  # Arrange
  local existing="$BACKUP_DIR/valora-weekly-2026-11-22_030000.dump"
  echo "backup-bom" >"$existing"
  # Act
  assert_exit_code 1 "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_equals "backup-bom" "$(cat "$existing")" "conteúdo do backup existente"
}

should_create_backup_with_mode_600_when_dump_succeeds() {
  # Arrange
  local backup_file="$BACKUP_DIR/valora-weekly-2026-11-22_030000.dump"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_equals "600" "$(stat -c %a "$backup_file")" "permissão do backup"
}

should_keep_all_backups_when_dump_fails() {
  # Arrange
  export STUB_DUMP_FAILS=1
  local old_backup="$BACKUP_DIR/valora-weekly-2025-01-05_030000.dump"
  touch "$old_backup"
  # Act
  assert_exit_code 1 "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_exists "$old_backup"
}

should_not_leave_tmp_file_when_dump_fails() {
  # Arrange
  export STUB_DUMP_FAILS=1
  # Act
  assert_exit_code 1 "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_equals "" "$(find "$BACKUP_DIR" -name '*.tmp')" "arquivos .tmp"
}
