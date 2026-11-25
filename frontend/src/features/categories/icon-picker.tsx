import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { normalizeSearchText } from '@/lib/text';

import { iconLabel } from './category-icon-labels';
import { CategoryGlyph, SUGGESTED_ICON_NAMES } from './category-icons';

/** Acha o ícone pelo nome em pt-BR ("carro") ou pelo nome do Lucide em inglês ("car"). */
function matchesIcon(iconName: string, term: string): boolean {
  return iconName.includes(term) || normalizeSearchText(iconLabel(iconName)).includes(term);
}

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

/** Escolha de ícone Lucide por busca e grade; serve para categorias e metas. */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const labelId = useId();
  const [search, setSearch] = useState('');
  const term = normalizeSearchText(search);
  const visibleIcons = SUGGESTED_ICON_NAMES.filter((iconName) => matchesIcon(iconName, term));

  return (
    <div className="space-y-2">
      <span id={labelId} className="text-sm leading-5 font-medium">
        Ícone
      </span>
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar ícone (ex.: carro)"
        aria-label="Buscar ícone"
      />
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid max-h-40 grid-cols-5 gap-1 overflow-y-auto rounded-md border p-1 sm:grid-cols-6"
      >
        {visibleIcons.map((iconName) => {
          const isSelected = iconName === value;
          return (
            <button
              key={iconName}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={iconLabel(iconName)}
              title={iconLabel(iconName)}
              onClick={() => onChange(iconName)}
              className={`flex h-11 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected ? 'bg-secondary text-primary ring-2 ring-primary' : 'text-foreground'
              }`}
            >
              <CategoryGlyph name={iconName} />
            </button>
          );
        })}
      </div>
      {visibleIcons.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum ícone com esse nome.</p>
      ) : null}
    </div>
  );
}
