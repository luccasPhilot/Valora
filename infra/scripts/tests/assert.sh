# Asserções dos testes de infra. Cada uma imprime o motivo e falha (retorno 1) quando não confere.

assert_equals() {
  local expected="$1" actual="$2" description="${3:-valor}"
  [[ "$expected" == "$actual" ]] && return 0
  echo "$description: esperado '$expected', veio '$actual'"
  return 1
}

assert_file_exists() {
  [[ -e "$1" ]] && return 0
  echo "arquivo deveria existir: $(basename "$1")"
  return 1
}

assert_file_missing() {
  [[ ! -e "$1" ]] && return 0
  echo "arquivo não deveria existir: $(basename "$1")"
  return 1
}

# assert_exit_code <código esperado> <comando...>
assert_exit_code() {
  local expected="$1"
  shift
  local actual=0
  "$@" >/dev/null 2>&1 || actual=$?
  assert_equals "$expected" "$actual" "código de saída de $(basename "$1")"
}

assert_contains() {
  local haystack="$1" needle="$2"
  [[ "$haystack" == *"$needle"* ]] && return 0
  echo "deveria conter '$needle':"
  echo "$haystack"
  return 1
}

assert_not_contains() {
  local haystack="$1" needle="$2"
  [[ "$haystack" != *"$needle"* ]] && return 0
  echo "não deveria conter '$needle':"
  echo "$haystack"
  return 1
}
