export interface ReportDefinition {
  readonly key: string;
  readonly label: string;
  /** Caminho filho de `/relatorios`. */
  readonly path: string;
  /** O relatório aceita o filtro por etiqueta. */
  readonly supportsTag?: boolean;
}

// Lista única dos relatórios que existem: alimenta a navegação entre eles. Cada change acrescenta o seu.
export const REPORT_DEFINITIONS: readonly ReportDefinition[] = [
  {
    key: 'income-expense',
    label: 'Receitas e despesas',
    path: 'receitas-e-despesas',
    supportsTag: true,
  },
  { key: 'category-spending', label: 'Por categoria', path: 'categorias', supportsTag: true },
  { key: 'savings-evolution', label: 'Evolução financeira', path: 'evolucao-financeira' },
  { key: 'net-worth', label: 'Patrimônio', path: 'patrimonio' },
];

export const REPORTS_BASE_PATH = '/relatorios';
