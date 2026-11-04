import { Hammer } from 'lucide-react';

import { type AppArea } from '@/lib/areas';

import { EmptyState } from './empty-state';

interface AreaNotReadyProps {
  area: AppArea;
}

// Área sem funcionalidade ainda: só explica, sem nenhum dado inventado.
export function AreaNotReady({ area }: AreaNotReadyProps) {
  return (
    <EmptyState
      icon={Hammer}
      title={`A área ${area.title} ainda não está pronta`}
      description="Esta área chega numa próxima etapa do Valora. Por enquanto não há nada para mostrar aqui."
    />
  );
}
