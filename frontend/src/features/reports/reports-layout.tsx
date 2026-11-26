import { useEffect, useState } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router';

import { SegmentedControl } from '@/components/segmented-control';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useDocumentTitle } from '@/hooks/use-document-title';

import { useTags } from '../tags/tags-queries';
import { REPORT_DEFINITIONS } from './report-definitions';
import { REPORT_PERIOD_OPTIONS } from './report-period';
import { ReportsNav } from './reports-nav';
import { useReportFilters } from './use-report-filters';

export const REPORT_FILTERS_ID = 'report-filters';

const REPORTS_TITLE = 'Relatórios';
const UNUSED_PERIOD_NOTE = 'O período passa a valer quando o histórico tiver dois meses.';

/** Leva o foco ao filtro de período, que fica acima do relatório. */
export function focusPeriodFilter(): void {
  document.getElementById(REPORT_FILTERS_ID)?.querySelector<HTMLElement>('[role="radio"]')?.focus();
}

interface ReportsOutletContext {
  readonly setIsPeriodUnused: (isUnused: boolean) => void;
}

/**
 * Um relatório avisa o layout quando o período não muda nada no que ele mostra (o patrimônio com um
 * mês de histórico): o filtro dá lugar a uma nota com o motivo.
 */
export function useReportPeriodUnused(isUnused: boolean): void {
  const context = useOutletContext<ReportsOutletContext | undefined>();
  const setIsPeriodUnused = context?.setIsPeriodUnused;
  useEffect(() => {
    setIsPeriodUnused?.(isUnused);
    return () => setIsPeriodUnused?.(false);
  }, [isUnused, setIsPeriodUnused]);
}

function useOpenReport() {
  const { pathname } = useLocation();
  return REPORT_DEFINITIONS.find((report) => pathname.endsWith(`/${report.path}`));
}

function useReportTitle(): string {
  const openReport = useOpenReport();
  return openReport ? `${openReport.label} | ${REPORTS_TITLE}` : REPORTS_TITLE;
}

interface TagFilterProps {
  tagId: string | null;
  onChange: (tagId: string | null) => void;
}

/** "Todas" é o padrão; uma etiqueta com o id que a URL guardou e que sumiu continua escolhida até trocar. */
function TagFilter({ tagId, onChange }: TagFilterProps) {
  const tagsQuery = useTags();
  const tags = tagsQuery.data ?? [];
  const isMissing = tagId !== null && !tags.some((tag) => tag.id === tagId);
  return (
    <div className="min-w-0 space-y-1.5 sm:w-56">
      <Label htmlFor="report-tag-filter">Etiqueta</Label>
      <Select
        id="report-tag-filter"
        value={tagId ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Todas</option>
        {isMissing ? <option value={tagId}>Etiqueta removida</option> : null}
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

/**
 * Estrutura dos relatórios: abas entre eles, o período e o relatório aberto. "Gráfico ou tabela"
 * fica no cartão que ele troca, não aqui.
 */
export function Component() {
  const { period, tagId, filtersSearch, setPeriod, setTagId } = useReportFilters();
  const openReport = useOpenReport();
  const isTagSupported = openReport?.supportsTag === true;
  const [isPeriodUnused, setIsPeriodUnused] = useState(false);
  useDocumentTitle(useReportTitle());
  return (
    <div className="space-y-4">
      <ReportsNav reports={REPORT_DEFINITIONS} filtersSearch={filtersSearch} />
      <div id={REPORT_FILTERS_ID} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {isPeriodUnused ? (
          <p className="text-sm text-muted-foreground">{UNUSED_PERIOD_NOTE}</p>
        ) : (
          <SegmentedControl
            label="Período"
            isLabelVisible={false}
            options={REPORT_PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            className="w-full sm:w-fit"
          />
        )}
        {isTagSupported ? <TagFilter tagId={tagId} onChange={setTagId} /> : null}
      </div>
      <Outlet context={{ setIsPeriodUnused } satisfies ReportsOutletContext} />
    </div>
  );
}
