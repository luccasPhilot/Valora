/**
 * Lançar, categorizar, ocultar conta e mudar limite alteram o Início: essas telas invalidam esta
 * chave. Fica num arquivo sem dependências para elas não carregarem o código do Início.
 */
export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;
