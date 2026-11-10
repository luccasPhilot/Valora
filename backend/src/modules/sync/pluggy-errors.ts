/** O Pluggy respondeu que o item (o banco conectado pelo Meu Pluggy) não existe mais. */
export class PluggyItemNotFoundError extends Error {
  constructor() {
    super('O Pluggy respondeu que o item não existe');
    this.name = 'PluggyItemNotFoundError';
  }
}

const NOT_FOUND_CODE = 404;

/**
 * O SDK do Pluggy rejeita as chamadas com o corpo de erro da API, que é um objeto simples
 * (`{ message, code, codeDescription, errorId }`), e não com um `Error`. Num item que não existe,
 * `code` é 404 (resposta conferida no sandbox e guardada em `test/fixtures/pluggy/`).
 */
export function isItemNotFoundBody(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return 'code' in error && error.code === NOT_FOUND_CODE;
}

/** Repassa o erro como veio, a não ser que seja o "item não existe", que vira um erro tipado. */
export function translateItemError(error: unknown): unknown {
  return isItemNotFoundBody(error) ? new PluggyItemNotFoundError() : error;
}
