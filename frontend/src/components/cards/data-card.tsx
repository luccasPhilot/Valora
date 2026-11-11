import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useId } from 'react';

type CardTier = 'hero' | 'standard';

const TIER_CLASSES: Readonly<Record<CardTier, string>> = {
  // Nível 1: a resposta principal da tela. Um por tela.
  hero: 'rounded-xl bg-secondary p-5 sm:p-6',
  // Nível 2: os blocos de apoio.
  standard: 'rounded-xl border bg-card p-4 shadow-card sm:p-5',
};

interface DataCardProps {
  /** Título curto: vira o nome acessível da região. */
  title: string;
  tier?: CardTier;
  /** Ícone pequeno ao lado do título (16 px). Só identifica o assunto; nunca compete com o valor. */
  icon?: LucideIcon;
  /** Marca que liga o cartão a uma legenda (ex.: a fatia de uma barra de composição). */
  marker?: ReactNode;
  /** Link ou botão do canto do cabeçalho. */
  action?: ReactNode;
  /** `h2` para cartões de primeiro nível; `h3` quando estão dentro de uma seção com título. */
  headingLevel?: 'h2' | 'h3';
  className?: string;
  children: ReactNode;
}

/**
 * Cartão com a hierarquia do Design System: o título é pequeno, em caixa alta e apagado (`type-label`);
 * o número-chave (`Metric`) e o conteúdo é que ganham peso. Todo cartão de dados usa este padrão.
 */
export function DataCard({
  title,
  tier = 'standard',
  icon: Icon,
  marker,
  action,
  headingLevel: Heading = 'h2',
  className,
  children,
}: DataCardProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn('flex h-full flex-col gap-4', TIER_CLASSES[tier], className)}
    >
      <header className="flex items-center justify-between gap-3">
        <Heading id={titleId} className="type-label flex min-w-0 items-center gap-2">
          {marker}
          {Icon ? <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" /> : null}
          <span className="min-w-0">{title}</span>
        </Heading>
        {action}
      </header>
      {children}
    </section>
  );
}
