import { normalizeSearchText } from '@/lib/text';

export interface SelectListOption {
  readonly value: string;
  readonly label: string;
  /** Nome do ícone vindo de `data-icon` na `<option>`; só as categorias usam. */
  readonly iconName: string | null;
  readonly isDisabled: boolean;
}

export interface SelectListGroup {
  readonly label: string | null;
  readonly options: readonly SelectListOption[];
}

function toListOption(option: HTMLOptionElement): SelectListOption {
  return {
    value: option.value,
    label: option.textContent,
    iconName: option.dataset.icon ?? null,
    isDisabled: option.disabled,
  };
}

/** Lê as opções do `<select>` já renderizado: ele continua sendo a fonte da verdade do campo. */
export function readSelectGroups(select: HTMLSelectElement): SelectListGroup[] {
  const groups: SelectListGroup[] = [];
  let looseOptions: SelectListOption[] = [];
  const flushLooseOptions = () => {
    if (looseOptions.length > 0) groups.push({ label: null, options: looseOptions });
    looseOptions = [];
  };

  for (const child of select.children) {
    if (child instanceof HTMLOptionElement) {
      looseOptions.push(toListOption(child));
    } else if (child instanceof HTMLOptGroupElement) {
      flushLooseOptions();
      groups.push({ label: child.label, options: Array.from(child.children, toOption) });
    }
  }
  flushLooseOptions();
  return groups;
}

function toOption(element: Element): SelectListOption {
  if (!(element instanceof HTMLOptionElement)) {
    throw new TypeError(`Select group has a child that is not an option: <${element.localName}>`);
  }
  return toListOption(element);
}

export function filterSelectGroups(
  groups: readonly SelectListGroup[],
  searchText: string,
): SelectListGroup[] {
  const searched = normalizeSearchText(searchText);
  if (searched === '') return [...groups];
  return groups
    .map((group) => ({
      label: group.label,
      options: group.options.filter((option) =>
        normalizeSearchText(option.label).includes(searched),
      ),
    }))
    .filter((group) => group.options.length > 0);
}

export function countSelectOptions(groups: readonly SelectListGroup[]): number {
  return groups.reduce((total, group) => total + group.options.length, 0);
}
