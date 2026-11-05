const DIACRITICS_PATTERN = /\p{Diacritic}/gu;
const REPEATED_WHITESPACE_PATTERN = /\s+/g;

// Forma usada pelas regras de categoria: "  Farmácia   São João " → "FARMACIA SAO JOAO".
export function normalizeDescription(description: string): string {
  return description
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toUpperCase()
    .replace(REPEATED_WHITESPACE_PATTERN, ' ')
    .trim();
}
