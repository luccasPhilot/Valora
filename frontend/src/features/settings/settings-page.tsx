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

export function Component() {
  const { preference, setPreference } = useTheme();

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
      <h2 id="theme-heading" className="text-lg font-semibold">
        Tema
      </h2>
      <div role="radiogroup" aria-labelledby="theme-heading" className="flex flex-wrap gap-2">
        {THEME_OPTIONS.map((option) => (
          <Button
            key={option.value}
            role="radio"
            aria-checked={preference === option.value}
            variant={preference === option.value ? 'default' : 'outline'}
            className="min-h-11"
            onClick={() => setPreference(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
