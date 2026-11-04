// O armazenamento local pode não existir (modo privado, política do navegador): nesse caso o app
// segue com os padrões, sem erro.
export function readStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento a escolha vale só até recarregar a página.
  }
}
