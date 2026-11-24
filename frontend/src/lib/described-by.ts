/** Liga o campo à dica (quando houver) e à mensagem de erro, só enquanto ela aparece. */
export function describedBy(ids: readonly (string | false)[]): string | undefined {
  const present = ids.filter((id): id is string => id !== false);
  return present.length > 0 ? present.join(' ') : undefined;
}
