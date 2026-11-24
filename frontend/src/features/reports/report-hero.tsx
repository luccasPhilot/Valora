import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';

interface ReportHeroProps {
  title: string;
  icon: LucideIcon;
  /** O número que responde a pergunta do relatório. */
  value: ReactNode;
  /** A frase que explica o número; sem ela o cartão mostra só o valor. */
  context?: ReactNode;
}

/**
 * O cartão-herói do relatório: o número que responde a pergunta, grande, e a frase que o explica.
 * Um por relatório; os demais números ficam em cartões de apoio abaixo.
 */
export function ReportHero({ title, icon, value, context }: ReportHeroProps) {
  return (
    <DataCard title={title} tier="hero" icon={icon} className="gap-2">
      <Metric size="lg" value={value} caption={context} />
    </DataCard>
  );
}
