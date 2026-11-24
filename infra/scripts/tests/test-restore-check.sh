# Testes do restore-check.sh.

should_restore_newest_backup_when_origins_and_legacy_names_are_mixed() {
  # Arrange
  echo "antigo" >"$BACKUP_DIR/valora-2026-11-21.dump"
  echo "semanal" >"$BACKUP_DIR/valora-weekly-2026-11-15_030000.dump"
  echo "predeploy-novo" >"$BACKUP_DIR/valora-predeploy-2026-11-21_101500.dump"
  echo "manual-velho" >"$BACKUP_DIR/valora-manual-2026-11-20_220000.dump"
  # Act
  "$SCRIPTS_DIR/restore-check.sh" >/dev/null
  # Assert
  assert_equals "predeploy-novo" "$(cat "$STUB_RESTORED_FILE")" "backup restaurado"
}

should_report_ok_when_all_six_tables_match() {
  # Arrange
  local output
  touch "$BACKUP_DIR/valora-weekly-2026-11-22_030000.dump"
  # Act
  output="$("$SCRIPTS_DIR/restore-check.sh")"
  # Assert
  assert_equals "6" "$(grep -c '(confere)' <<<"$output")" "tabelas que conferem"
}

should_fail_and_name_table_when_investment_snapshots_diverge() {
  # Arrange
  export STUB_RESTORED_COUNT_investment_snapshots=9
  local output exit_code=0
  touch "$BACKUP_DIR/valora-weekly-2026-11-22_030000.dump"
  # Act
  output="$("$SCRIPTS_DIR/restore-check.sh")" || exit_code=$?
  # Assert
  assert_equals "1" "$exit_code" "código de saída"
  assert_contains "$output" "investment_snapshots: banco em uso 10, backup 9 (DIVERGE)"
}

should_fail_when_backup_dir_has_no_backup() {
  # Arrange
  touch "$BACKUP_DIR/valora-antes-da-migracao.dump"
  # Act / Assert
  assert_exit_code 1 "$SCRIPTS_DIR/restore-check.sh"
}

should_drop_check_database_when_counts_diverge() {
  # Arrange
  export STUB_RESTORED_COUNT_transactions=1
  touch "$BACKUP_DIR/valora-weekly-2026-11-22_030000.dump"
  # Act
  assert_exit_code 1 "$SCRIPTS_DIR/restore-check.sh"
  # Assert
  assert_equals "DROP DATABASE IF EXISTS valora_restore_check" \
    "$(grep -o 'DROP DATABASE.*' "$STUB_CALLS" | tail -n 1)" "última chamada ao banco"
}
