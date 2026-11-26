import { cn } from 'cn';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { FormPanel } from '@/components/form-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import type { Category } from '@/lib/api/categories';
import type { Tag } from '@/lib/api/tags';
import {
  type AccountOption,
  TRANSACTION_TYPES,
  type TransactionSource,
  type TransactionType,
  UNCATEGORIZED_FILTER,
} from '@/lib/api/transactions';

import { CategorySelect } from '../categories/category-select';
import {
  accountOptionLabel,
  activeFilterCount,
  describeActiveFilters,
  NO_FILTERS,
  PERIOD_LABELS,
  PERIOD_PRESETS,
  type PeriodPreset,
  SOURCE_LABELS,
  TRANSACTION_SOURCES,
  type TransactionFilters,
  TYPE_LABELS,
  UNCATEGORIZED_LABEL,
  withoutPanelFilters,
} from './transaction-filters';

const SEARCH_DEBOUNCE_MS = 300;
// Larga o bastante para "Últimos 3 meses" e as datas aparecerem inteiros.
const DESKTOP_FIELD_WIDTH = 'w-48';

export interface FiltersBarHandle {
  /** Leva o foco ao filtro de período (no celular, abre o painel "Filtros"). */
  focusPeriod: () => void;
}

interface TransactionFiltersBarProps {
  filters: TransactionFilters;
  categories: readonly Category[];
  accounts: readonly AccountOption[];
  tags: readonly Tag[];
  isPhone: boolean;
  /** Quantas transações o filtro traz (do resumo); nulo enquanto carrega. */
  resultCount: number | null;
  onChange: (filters: TransactionFilters) => void;
  handleRef?: Ref<FiltersBarHandle>;
}

function showResultsLabel(resultCount: number | null): string {
  if (resultCount === null) return 'Ver transações';
  return resultCount === 1 ? 'Ver 1 transação' : `Ver ${resultCount} transações`;
}

function findPeriod(value: string): PeriodPreset | undefined {
  return PERIOD_PRESETS.find((preset) => preset === value);
}

function findType(value: string): TransactionType | null {
  return TRANSACTION_TYPES.find((type) => type === value) ?? null;
}

function findSource(value: string): TransactionSource | null {
  return TRANSACTION_SOURCES.find((source) => source === value) ?? null;
}

interface FieldProps {
  label: string;
  className?: string;
  children: (fieldId: string) => ReactNode;
}

function Field({ label, className, children }: FieldProps) {
  const fieldId = useId();
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      {children(fieldId)}
    </div>
  );
}

interface SearchFieldProps {
  value: string;
  onCommit: (search: string) => void;
}

/** Espera 300 ms sem digitar antes de buscar; uma mudança vinda de fora (limpar filtros) entra na hora. */
function SearchField({ value, onCommit }: SearchFieldProps) {
  const [text, setText] = useState(value);
  const lastCommitted = useRef(value);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (value === lastCommitted.current) return;
    window.clearTimeout(timer.current);
    lastCommitted.current = value;
    setText(value);
  }, [value]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function handleChange(nextText: string) {
    setText(nextText);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      lastCommitted.current = nextText;
      onCommit(nextText);
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <Field label="Buscar">
      {(fieldId) => (
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={fieldId}
            type="search"
            placeholder="Buscar na descrição ou na nota"
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            className="pl-9"
          />
        </div>
      )}
    </Field>
  );
}

interface PeriodFieldsProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  periodRef?: Ref<HTMLSelectElement>;
  /** Largura dos campos na barra do computador; no painel do celular ocupam a linha toda. */
  fieldClassName?: string;
}

function PeriodFields({ filters, onChange, periodRef, fieldClassName }: PeriodFieldsProps) {
  return (
    <>
      <Field label="Período" className={fieldClassName}>
        {(fieldId) => (
          <Select
            id={fieldId}
            ref={periodRef}
            value={filters.period}
            onChange={(event) => {
              const period = findPeriod(event.target.value);
              if (period) onChange({ ...filters, period });
            }}
          >
            {PERIOD_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {PERIOD_LABELS[preset]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {filters.period === 'custom' ? (
        <>
          <Field label="De" className={fieldClassName}>
            {(fieldId) => (
              <Input
                id={fieldId}
                type="date"
                value={filters.from ?? ''}
                max={filters.to ?? undefined}
                onChange={(event) => onChange({ ...filters, from: event.target.value || null })}
              />
            )}
          </Field>
          <Field label="Até" className={fieldClassName}>
            {(fieldId) => (
              <Input
                id={fieldId}
                type="date"
                value={filters.to ?? ''}
                min={filters.from ?? undefined}
                onChange={(event) => onChange({ ...filters, to: event.target.value || null })}
              />
            )}
          </Field>
        </>
      ) : null}
    </>
  );
}

interface PanelFieldsProps {
  filters: TransactionFilters;
  categories: readonly Category[];
  accounts: readonly AccountOption[];
  tags: readonly Tag[];
  onChange: (filters: TransactionFilters) => void;
}

/** Os filtros que abrem sob demanda: categoria, tipo, origem, conta e etiqueta. */
function PanelFields({ filters, categories, accounts, tags, onChange }: PanelFieldsProps) {
  return (
    <>
      <Field label="Categoria">
        {(fieldId) => (
          <CategorySelect
            id={fieldId}
            categories={categories}
            value={filters.categoryId ?? ''}
            emptyLabel="Todas as categorias"
            extraOption={{ value: UNCATEGORIZED_FILTER, label: UNCATEGORIZED_LABEL }}
            onValueChange={(categoryId) => onChange({ ...filters, categoryId: categoryId || null })}
          />
        )}
      </Field>
      <Field label="Tipo">
        {(fieldId) => (
          <Select
            id={fieldId}
            value={filters.type ?? ''}
            onChange={(event) => onChange({ ...filters, type: findType(event.target.value) })}
          >
            <option value="">Todos os tipos</option>
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Origem">
        {(fieldId) => (
          <Select
            id={fieldId}
            value={filters.source ?? ''}
            onChange={(event) => onChange({ ...filters, source: findSource(event.target.value) })}
          >
            <option value="">Todas as origens</option>
            {TRANSACTION_SOURCES.map((source) => (
              <option key={source} value={source}>
                {SOURCE_LABELS[source]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Conta">
        {(fieldId) => (
          <Select
            id={fieldId}
            value={filters.accountId ?? ''}
            onChange={(event) => onChange({ ...filters, accountId: event.target.value || null })}
          >
            <option value="">Todas as contas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {accountOptionLabel(account)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Etiqueta">
        {(fieldId) => (
          <Select
            id={fieldId}
            value={filters.tagId ?? ''}
            onChange={(event) => onChange({ ...filters, tagId: event.target.value || null })}
          >
            <option value="">Todas as etiquetas</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </>
  );
}

interface FilterChipsProps {
  filters: TransactionFilters;
  categories: readonly Category[];
  accounts: readonly AccountOption[];
  tags: readonly Tag[];
  onChange: (filters: TransactionFilters) => void;
}

function FilterChips({ filters, categories, accounts, tags, onChange }: FilterChipsProps) {
  const chips = describeActiveFilters(filters, { categories, accounts, tags });
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Filtros ativos" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <span className="inline-flex min-h-11 items-center gap-1 rounded-full bg-secondary pl-3 text-sm font-medium text-secondary-foreground">
            {chip.label}
            <button
              type="button"
              aria-label={`Remover filtro ${chip.label}`}
              onClick={() => onChange(chip.filtersWithoutIt)}
              className="flex size-11 items-center justify-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </span>
        </li>
      ))}
      <li>
        <Button variant="ghost" onClick={() => onChange(NO_FILTERS)}>
          Limpar filtros
        </Button>
      </li>
    </ul>
  );
}

export function TransactionFiltersBar({
  filters,
  categories,
  accounts,
  tags,
  isPhone,
  resultCount,
  onChange,
  handleRef,
}: TransactionFiltersBarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const periodRef = useRef<HTMLSelectElement>(null);
  useImperativeHandle(handleRef, () => ({
    focusPeriod: () => (isPhone ? setIsPanelOpen(true) : periodRef.current?.focus()),
  }));
  const fieldProps = { filters, categories, accounts, tags, onChange };
  const activeCount = activeFilterCount(filters, { isPeriodInside: isPhone });
  const filtersLabel = `Filtros${activeCount > 0 ? ` (${activeCount})` : ''}`;

  return (
    <div className="space-y-3">
      {isPhone ? (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <SearchField
              value={filters.search}
              onCommit={(search) => onChange({ ...filters, search })}
            />
          </div>
          <Button variant="outline" onClick={() => setIsPanelOpen(true)}>
            <SlidersHorizontal aria-hidden="true" />
            {filtersLabel}
          </Button>
          <FormPanel
            open={isPanelOpen}
            onOpenChange={setIsPanelOpen}
            title="Filtros"
            description="Período, categoria, tipo, origem, conta e etiqueta."
          >
            <div className="space-y-4">
              <PeriodFields filters={filters} onChange={onChange} />
              <PanelFields {...fieldProps} />
              <Button className="w-full" onClick={() => setIsPanelOpen(false)}>
                {showResultsLabel(resultCount)}
              </Button>
            </div>
          </FormPanel>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <SearchField
              value={filters.search}
              onCommit={(search) => onChange({ ...filters, search })}
            />
          </div>
          <PeriodFields
            filters={filters}
            onChange={onChange}
            periodRef={periodRef}
            fieldClassName={DESKTOP_FIELD_WIDTH}
          />
          <Popover open={isPanelOpen} onOpenChange={setIsPanelOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal aria-hidden="true" />
                {filtersLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent aria-label="Filtros" className="w-[min(22rem,calc(100vw-2rem))] p-4">
              <div className="space-y-4">
                <PanelFields {...fieldProps} />
                {activeCount > 0 ? (
                  <div className="border-t pt-3">
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => onChange(withoutPanelFilters(filters))}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <FilterChips {...fieldProps} />
    </div>
  );
}
