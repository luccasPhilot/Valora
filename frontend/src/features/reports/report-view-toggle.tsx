import { SegmentedControl, type SegmentedOption } from '@/components/segmented-control';

import { type ReportView, useReportFilters } from './use-report-filters';

const VIEW_OPTIONS: readonly SegmentedOption<ReportView>[] = [
  { value: 'grafico', label: 'Gráfico' },
  { value: 'tabela', label: 'Tabela' },
];

/**
 * Gráfico ou tabela, no canto do cartão que ele troca. A escolha fica na URL (`?visao=`) e vale
 * para o relatório todo, então qualquer cartão com este botão mexe no mesmo estado.
 */
export function ReportViewToggle() {
  const { view, setView } = useReportFilters();
  return (
    <SegmentedControl
      label="Visualização"
      isLabelVisible={false}
      options={VIEW_OPTIONS}
      value={view}
      onChange={setView}
    />
  );
}
