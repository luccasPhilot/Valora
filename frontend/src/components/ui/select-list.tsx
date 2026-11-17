import { cn } from 'cn';
import { Check, Search } from 'lucide-react';
import * as React from 'react';

import {
  countSelectOptions,
  filterSelectGroups,
  type SelectListGroup,
  type SelectListOption,
} from './select-options';

// Com poucas opções a busca só atrapalha; a partir daqui ela aparece no topo da lista.
const SEARCH_MIN_OPTIONS = 8;

export type RenderOptionIcon = (iconName: string) => React.ReactNode;

interface SelectListProps {
  groups: readonly SelectListGroup[];
  selectedValue: string;
  renderOptionIcon: RenderOptionIcon | undefined;
  onPick: (value: string) => void;
}

function flattenEnabledOptions(groups: readonly SelectListGroup[]): SelectListOption[] {
  return groups.flatMap((group) => group.options.filter((option) => !option.isDisabled));
}

function moveIndex(key: string, current: number, count: number): number {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const step = key === 'ArrowDown' ? 1 : -1;
  return Math.min(count - 1, Math.max(0, current + step));
}

const NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

/**
 * Lista de opções para quem usa mouse. O toque continua com o seletor do sistema (ver `Select`).
 * O foco fica na busca (ou na própria lista) e a opção ativa é anunciada por `aria-activedescendant`.
 */
export function SelectList({ groups, selectedValue, renderOptionIcon, onPick }: SelectListProps) {
  const listId = React.useId();
  const [searchText, setSearchText] = React.useState('');
  const hasSearch = countSelectOptions(groups) >= SEARCH_MIN_OPTIONS;
  const visibleGroups = filterSelectGroups(groups, searchText);
  const enabledOptions = flattenEnabledOptions(visibleGroups);
  const [activeValue, setActiveValue] = React.useState(selectedValue);
  const activeIndex = Math.max(
    0,
    enabledOptions.findIndex((option) => option.value === activeValue),
  );
  const activeOption = enabledOptions[activeIndex];
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => (searchRef.current ?? listRef.current)?.focus(), []);
  React.useEffect(() => {
    document.getElementById(optionId(listId, activeOption?.value))?.scrollIntoView({
      block: 'nearest',
    });
  }, [listId, activeOption?.value]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (NAVIGATION_KEYS.has(event.key)) {
      event.preventDefault();
      const next = enabledOptions[moveIndex(event.key, activeIndex, enabledOptions.length)];
      if (next) setActiveValue(next.value);
    } else if (event.key === 'Enter' && activeOption) {
      event.preventDefault();
      onPick(activeOption.value);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    const firstMatch = flattenEnabledOptions(filterSelectGroups(groups, text))[0];
    if (firstMatch) setActiveValue(firstMatch.value);
  };

  return (
    <div onKeyDown={handleKeyDown} className="flex max-h-80 flex-col">
      {hasSearch ? (
        <SearchField
          inputRef={searchRef}
          listId={listId}
          activeValue={activeOption?.value}
          searchText={searchText}
          onChange={handleSearchChange}
        />
      ) : null}
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        tabIndex={hasSearch ? undefined : -1}
        aria-activedescendant={hasSearch ? undefined : optionId(listId, activeOption?.value)}
        className="overflow-y-auto p-1.5 outline-hidden"
      >
        {visibleGroups.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nada encontrado para “{searchText.trim()}”.
          </p>
        ) : (
          visibleGroups.map((group) => (
            <OptionGroup
              key={group.label ?? ''}
              group={group}
              listId={listId}
              selectedValue={selectedValue}
              activeValue={activeOption?.value}
              renderOptionIcon={renderOptionIcon}
              onActivate={setActiveValue}
              onPick={onPick}
            />
          ))
        )}
      </div>
    </div>
  );
}

function optionId(listId: string, value: string | undefined): string {
  return `${listId}-${value ?? ''}`;
}

interface SearchFieldProps {
  inputRef: React.Ref<HTMLInputElement>;
  listId: string;
  activeValue: string | undefined;
  searchText: string;
  onChange: (text: string) => void;
}

function SearchField({ inputRef, listId, activeValue, searchText, onChange }: SearchFieldProps) {
  return (
    <div className="relative border-b p-1.5">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={optionId(listId, activeValue)}
        aria-label="Buscar"
        placeholder="Buscar"
        autoComplete="off"
        value={searchText}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-sm bg-transparent pr-3 pl-9 text-sm outline-hidden placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </div>
  );
}

interface OptionGroupProps {
  group: SelectListGroup;
  listId: string;
  selectedValue: string;
  activeValue: string | undefined;
  renderOptionIcon: RenderOptionIcon | undefined;
  onActivate: (value: string) => void;
  onPick: (value: string) => void;
}

function OptionGroup({ group, ...optionProps }: OptionGroupProps) {
  const labelId = React.useId();
  return (
    <div role="group" aria-labelledby={group.label === null ? undefined : labelId}>
      {group.label === null ? null : (
        <div id={labelId} className="px-3 pt-3 pb-1 type-label first:pt-1.5">
          {group.label}
        </div>
      )}
      {group.options.map((option) => (
        <OptionRow key={option.value} option={option} {...optionProps} />
      ))}
    </div>
  );
}

interface OptionRowProps {
  option: SelectListOption;
  listId: string;
  selectedValue: string;
  activeValue: string | undefined;
  renderOptionIcon: RenderOptionIcon | undefined;
  onActivate: (value: string) => void;
  onPick: (value: string) => void;
}

function OptionRow({
  option,
  listId,
  selectedValue,
  activeValue,
  renderOptionIcon,
  onActivate,
  onPick,
}: OptionRowProps) {
  const isSelected = option.value === selectedValue;
  const isActive = option.value === activeValue;
  return (
    <div
      id={optionId(listId, option.value)}
      role="option"
      aria-selected={isSelected}
      aria-disabled={option.isDisabled || undefined}
      onMouseMove={() => !option.isDisabled && onActivate(option.value)}
      onClick={() => !option.isDisabled && onPick(option.value)}
      className={cn(
        'flex min-h-10 cursor-pointer items-center gap-3 rounded-sm px-3 text-sm',
        isActive && 'bg-accent',
        isSelected && 'bg-secondary font-medium text-secondary-foreground',
        option.isDisabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {option.iconName !== null && renderOptionIcon ? (
        <span className="shrink-0 text-muted-foreground">{renderOptionIcon(option.iconName)}</span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {isSelected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
    </div>
  );
}
