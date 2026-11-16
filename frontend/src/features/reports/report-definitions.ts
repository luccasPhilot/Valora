export interface ReportDefinition {
  readonly key: string;
  readonly label: string;
  /** Caminho filho de `/relatorios`. */
  readonly path: string;
}

// Lista única dos relatórios que existem: alimenta a navegação entre eles. Cada change acrescenta o seu.
export const REPORT_DEFINITIONS: readonly ReportDefinition[] = [
  { key: 'income-expense', label: 'Receitas e despesas', path: 'receitas-e-despesas' },
  { key: 'category-spending', label: 'Por categoria', path: 'categorias' },
  { key: 'savings-evolution', label: 'Evolução financeira', path: 'evolucao-financeira' },
  { key: 'net-worth', label: 'Patrimônio', path: 'patrimonio' },
];

export const REPORTS_BASE_PATH = '/relatorios';
