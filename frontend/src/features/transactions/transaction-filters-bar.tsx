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
import { Select } from '@/components/ui/select';
import type { Category } from '@/lib/api/categories';
import {
  type AccountOption,
  TRANSACTION_TYPES,
  type TransactionType,
} from '@/lib/api/transactions';

import { CategorySelect } from '../categories/category-select';
import {
  accountOptionLabel,
  describeActiveFilters,
  NO_FILTERS,
  PERIOD_LABELS,
  PERIOD_PRESETS,
  type PeriodPreset,
  type TransactionFilters,
  TYPE_LABELS,
} from './transaction-filters';

const SEARCH_DEBOUNCE_MS = 300;

export interface FiltersBarHandle {
  /** Leva o foco ao filtro de período (no celular, abre o painel "Filtros"). */
  focusPeriod: () => void;
}

interface TransactionFiltersBarProps {
  filters: TransactionFilters;
  categories: readonly Category[];
  accounts: readonly AccountOption[];
  isPhone: boolean;
  onChange: (filters: TransactionFilters) => void;
  handleRef?: Ref<FiltersBarHandle>;
}

function findPeriod(value: string): PeriodPreset | undefined {
  return PERIOD_PRESETS.find((preset) => preset === value);
}

function findType(value: string): TransactionType | null {
  return TRANSACTION_TYPES.find((type) => type === value) ?? null;
}

interface FieldProps {
  label: string;
  children: (fieldId: string) => ReactNode;
}

function Field({ label, children }: FieldProps) {
  const fieldId = useId();
  return (
    <div className="min-w-0 space-y-1.5">
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
            placeholder="Buscar na descrição"
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            className="pl-9"
          />
        </div>
      )}
    </Field>
  );
}

interface FilterFieldsProps extends Omit<TransactionFiltersBarProps, 'isPhone' | 'handleRef'> {
  periodRef?: Ref<HTMLSelectElement>;
}

function FilterFields({ filters, categories, accounts, onChange, periodRef }: FilterFieldsProps) {
  return (
    <>
      <Field label="Período">
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
          <Field label="De">
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
          <Field label="Até">
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
      <Field label="Categoria">
        {(fieldId) => (
          <CategorySelect
            id={fieldId}
            categories={categories}
            value={filters.categoryId ?? ''}
            emptyLabel="Todas as categorias"
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
    </>
  );
}

interface FilterChipsProps {
  filters: TransactionFilters;
  categories: readonly Category[];
  accounts: readonly AccountOption[];
  onChange: (filters: TransactionFilters) => void;
}

function FilterChips({ filters, categories, accounts, onChange }: FilterChipsProps) {
  const chips = describeActiveFilters(filters, { categories, accounts });
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
  isPhone,
  onChange,
  handleRef,
}: TransactionFiltersBarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const periodRef = useRef<HTMLSelectElement>(null);
  useImperativeHandle(handleRef, () => ({
    focusPeriod: () => (isPhone ? setIsPanelOpen(true) : periodRef.current?.focus()),
  }));
  const fieldProps = { filters, categories, accounts, onChange };
  const activeCount = describeActiveFilters(filters, { categories, accounts }).filter(
    (chip) => chip.key !== 'search',
  ).length;

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
            Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
          <FormPanel
            open={isPanelOpen}
            onOpenChange={setIsPanelOpen}
            title="Filtros"
            description="Período, categoria, tipo e conta."
          >
            <div className="space-y-4">
              <FilterFields {...fieldProps} />
              <Button className="w-full" onClick={() => setIsPanelOpen(false)}>
                Ver resultados
              </Button>
            </div>
          </FormPanel>
        </div>
      ) : (
        <div className="grid items-end gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[minmax(12rem,1.4fr)_repeat(4,minmax(0,1fr))]">
          <SearchField
            value={filters.search}
            onCommit={(search) => onChange({ ...filters, search })}
          />
          <FilterFields {...fieldProps} periodRef={periodRef} />
        </div>
      )}
      <FilterChips {...fieldProps} />
    </div>
  );
}
