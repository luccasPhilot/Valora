import type { ReactNode } from 'react';

interface ValueRowProps {
  /** Nome do item: texto médio, o segundo nível de peso do cartão. */
  title: string;
  /** Contexto do item, pequeno e apagado ("CDB · Nubank"). */
  subtitle?: string;
  /** O valor, normalmente `<Money />`, em negrito. */
  value: ReactNode;
  /** A fatia do total, pequena e apagada. */
  share?: ReactNode;
}

/** Linha de lista de um cartão: nome e contexto à esquerda, valor e fatia à direita. Sem moldura. */
export function ValueRow({ title, subtitle, value, share }: ValueRowProps) {
  return (
    <li className="flex min-h-12 items-center justify-between gap-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-right whitespace-nowrap tabular-nums">
        <span className="block text-sm font-semibold">{value}</span>
        {share ? <span className="block text-xs text-muted-foreground">{share}</span> : null}
      </span>
    </li>
  );
}
