/** Recarrega a página. Num módulo próprio para os testes trocarem: o jsdom não implementa a recarga. */
export function reloadPage(): void {
  window.location.reload();
}
