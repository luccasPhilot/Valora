# Testes da retenção em camadas do backup.sh. Hoje é STUB_TODAY (2026-11-22).

days_ago() {
  date -u -d "$STUB_TODAY - $1 days" +%F
}

create_backup() {
  local origin="$1" days="$2"
  local path="$BACKUP_DIR/valora-$origin-$(days_ago "$days")_030000.dump"
  touch "$path"
  echo "$path"
}

# Três semanais mais novos, para os testes não caírem na regra dos 3 mais recentes.
create_recent_weeklies() {
  create_backup weekly 7 >/dev/null
  create_backup weekly 14 >/dev/null
  create_backup weekly 21 >/dev/null
}

should_keep_weekly_when_it_is_56_days_old() {
  # Arrange
  create_recent_weeklies
  # Um semanal mais velho no mesmo mês: o de 56 dias não fica pela regra do primeiro do mês.
  touch "$BACKUP_DIR/valora-weekly-2026-09-05_030000.dump"
  local backup_file
  backup_file="$(create_backup weekly 56)"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_exists "$backup_file"
}

should_delete_weekly_when_it_is_57_days_old_and_not_first_of_month() {
  # Arrange
  create_recent_weeklies
  local first_of_month mid_month
  first_of_month="$BACKUP_DIR/valora-weekly-2026-09-05_030000.dump"
  touch "$first_of_month"
  mid_month="$(create_backup weekly 57)"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_missing "$mid_month"
}

should_keep_first_weekly_of_month_when_it_is_200_days_old() {
  # Arrange
  create_recent_weeklies
  local backup_file
  backup_file="$(create_backup weekly 200)"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_exists "$backup_file"
}

should_delete_first_weekly_of_month_when_it_is_366_days_old() {
  # Arrange
  create_recent_weeklies
  local backup_file
  backup_file="$(create_backup weekly 366)"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_missing "$backup_file"
}

should_keep_legacy_backup_when_it_is_40_days_old() {
  # Arrange
  create_recent_weeklies
  local backup_file="$BACKUP_DIR/valora-$(days_ago 40).dump"
  touch "$backup_file"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_exists "$backup_file"
}

should_delete_predeploys_of_31_days_when_three_newer_exist() {
  # Arrange
  create_backup predeploy 1 >/dev/null
  create_backup predeploy 2 >/dev/null
  create_backup predeploy 3 >/dev/null
  local expired="$BACKUP_DIR/valora-predeploy-$(days_ago 31)_090000.dump"
  local also_expired="$BACKUP_DIR/valora-predeploy-$(days_ago 31)_180000.dump"
  touch "$expired" "$also_expired"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_missing "$expired"
  assert_file_missing "$also_expired"
}

should_keep_the_only_three_predeploys_when_all_are_expired() {
  # Arrange
  local oldest
  create_backup predeploy 40 >/dev/null
  create_backup predeploy 50 >/dev/null
  oldest="$(create_backup predeploy 60)"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_exists "$oldest"
}

should_delete_manual_when_it_is_31_days_old_and_three_newer_exist() {
  # Arrange
  create_backup manual 1 >/dev/null
  create_backup manual 2 >/dev/null
  create_backup manual 3 >/dev/null
  local expired
  expired="$(create_backup manual 31)"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_missing "$expired"
}

should_keep_unknown_file_when_it_is_400_days_old() {
  # Arrange
  local unknown="$BACKUP_DIR/valora-antes-da-migracao.dump"
  touch -d "$(days_ago 400)" "$unknown"
  # Act
  "$SCRIPTS_DIR/backup.sh" weekly
  # Assert
  assert_file_exists "$unknown"
}

should_log_only_the_name_when_a_backup_is_deleted() {
  # Arrange
  create_recent_weeklies
  local expired output
  expired="$(create_backup weekly 366)"
  # Act
  output="$("$SCRIPTS_DIR/backup.sh" weekly)"
  # Assert
  assert_contains "$output" "apagado: $(basename "$expired")"
}
