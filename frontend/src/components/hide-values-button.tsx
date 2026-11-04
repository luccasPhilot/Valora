import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useHideValues } from './hide-values-provider';

export function HideValuesButton() {
  const { areValuesHidden, toggleValuesHidden } = useHideValues();
  const label = areValuesHidden ? 'Mostrar valores' : 'Ocultar valores';
  const Icon = areValuesHidden ? EyeOff : Eye;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 rounded-full"
      aria-label={label}
      aria-pressed={areValuesHidden}
      onClick={toggleValuesHidden}
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  );
}
