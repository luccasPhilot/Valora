#!/usr/bin/env bash
# Gera as notas de um release a partir dos commits (Conventional Commits) entre a
# tag anterior e o fim do release. Usado pelo workflow de release e para montar o CHANGELOG.md.
#
# Uso: release-notes.sh [--heading] <tag> [ref-final]
#   --heading   imprime "## <tag> - <data>" antes das seções (formato do CHANGELOG.md)
#   ref-final   commit onde o release termina (padrão: a própria tag)
set -euo pipefail

SECTION_ORDER=(feat fix perf refactor docs test ci chore)

declare -A SECTION_TITLES=(
  [feat]="Funcionalidades"
  [fix]="Correções"
  [perf]="Desempenho"
  [refactor]="Refatorações"
  [docs]="Documentação"
  [test]="Testes"
  [ci]="CI"
  [chore]="Manutenção"
)

SHOULD_PRINT_HEADING=false
if [[ "${1:-}" == "--heading" ]]; then
  SHOULD_PRINT_HEADING=true
  shift
fi

TAG="${1:?Uso: release-notes.sh [--heading] <tag> [ref-final]}"
END_REF="${2:-$TAG}"

# Tags v* alcançáveis a partir do fim do release, da mais nova para a mais antiga.
PREVIOUS_TAG="$(git tag --merged "$END_REF" --list 'v*' --sort=-v:refname | grep -vx "$TAG" | head -n 1 || true)"
RANGE="${PREVIOUS_TAG:+$PREVIOUS_TAG..}$END_REF"
RELEASE_DATE="$(git log -1 --format=%cs "$END_REF")"

if [[ "$SHOULD_PRINT_HEADING" == true ]]; then
  echo "## $TAG - $RELEASE_DATE"
  echo
fi

# Commits de merge ficam de fora: o histórico da PR são os commits dela, não o "Merge pull request".
SUBJECTS="$(git log --no-merges --reverse --format=%s "$RANGE")"

for type in "${SECTION_ORDER[@]}"; do
  ENTRIES="$(grep -E "^${type}(\(.+\))?!?: " <<<"$SUBJECTS" || true)"
  [[ -z "$ENTRIES" ]] && continue

  echo "### ${SECTION_TITLES[$type]}"
  echo
  # "feat(goals): add x" vira "- **goals:** add x"; sem escopo, "- add x".
  sed -E "s/^${type}\(([^)]+)\)!?: /- **\1:** /; s/^${type}!?: /- /" <<<"$ENTRIES"
  echo
done

OTHER_ENTRIES="$(grep -vE "^($(IFS='|'; echo "${SECTION_ORDER[*]}"))(\(.+\))?!?: " <<<"$SUBJECTS" || true)"
if [[ -n "$OTHER_ENTRIES" ]]; then
  echo "### Outros"
  echo
  sed -E 's/^/- /' <<<"$OTHER_ENTRIES"
  echo
fi

if [[ -n "${GITHUB_REPOSITORY:-}" && -n "$PREVIOUS_TAG" ]]; then
  echo "**Comparação completa:** https://github.com/${GITHUB_REPOSITORY}/compare/${PREVIOUS_TAG}...${TAG}"
fi
