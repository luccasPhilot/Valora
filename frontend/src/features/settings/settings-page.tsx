import { Check, SunMoon } from 'lucide-react';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { type ThemePreference } from '@/lib/theme';

interface ThemeOption {
  readonly value: ThemePreference;
  readonly label: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

const SELECTED_OPTION_CLASSES = 'bg-secondary text-secondary-foreground hover:bg-secondary';

export function Component() {
  const { preference, setPreference } = useTheme();

  return (
    <section className="space-y-4 rounded-lg border bg-card p-5 shadow-card">
      <h2 id="theme-heading" className="type-label flex items-center gap-2">
        <SunMoon className="size-4 text-primary" aria-hidden="true" />
        Tema
      </h2>
      <div
        role="radiogroup"
        aria-labelledby="theme-heading"
        className="inline-flex flex-wrap gap-1 rounded-full border bg-card p-1"
      >
        {THEME_OPTIONS.map((option) => {
          const isSelected = preference === option.value;
          return (
            <Button
              key={option.value}
              role="radio"
              aria-checked={isSelected}
              variant="ghost"
              className={`rounded-full ${isSelected ? SELECTED_OPTION_CLASSES : ''}`}
              onClick={() => setPreference(option.value)}
            >
              {isSelected ? <Check aria-hidden="true" /> : null}
              {option.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
