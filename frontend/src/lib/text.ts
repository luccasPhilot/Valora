const DIACRITICS_PATTERN = /\p{Diacritic}/gu;

/** Para comparar textos na busca da tela: sem acento, sem maiúsculas e sem espaços nas pontas. */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase().trim();
}
