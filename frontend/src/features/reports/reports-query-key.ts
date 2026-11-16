/**
 * Lançar, editar, excluir ou recategorizar uma transação muda os números dos relatórios: essas telas
 * invalidam esta chave. Fica num arquivo sem dependências para elas não carregarem o código dos relatórios.
 */
export const REPORTS_QUERY_KEY = ['reports'] as const;
