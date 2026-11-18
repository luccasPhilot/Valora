import type { ReactNode } from 'react';

interface ValueRowProps {
  /** Nome do item: texto médio, o segundo nível de peso do cartão. */
  title: string;
  /** Contexto do item, pequeno e apagado ("CDB · Nubank"). */
  subtitle?: string;
  /** Terceira linha, pequena e apagada: um detalhe que não cabe no contexto ("Atualizado em 10/11"). */
  detail?: ReactNode;
  /** Selo ao lado do nome ("Manual"); o nome é quem encolhe numa tela estreita. */
  badge?: ReactNode;
  /** O valor, normalmente `<Money />`, em negrito. */
  value: ReactNode;
  /** A fatia do total, pequena e apagada. */
  share?: ReactNode;
  /** Com ele, a linha inteira vira um botão (alvo de toque de 48 px) que abre o item. */
  onSelect?: () => void;
  /** Nome acessível do botão, quando `onSelect` existe ("Editar Fundo INCO"). */
  selectLabel?: string;
}

function RowContent({ title, subtitle, detail, badge, value, share }: ValueRowProps) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {badge}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
        {detail ? (
          <span className="block truncate text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-right whitespace-nowrap tabular-nums">
        <span className="block text-sm font-semibold">{value}</span>
        {share ? <span className="block text-xs text-muted-foreground">{share}</span> : null}
      </span>
    </>
  );
}

/** Linha de lista de um cartão: nome e contexto à esquerda, valor e fatia à direita. Sem moldura. */
export function ValueRow(props: ValueRowProps) {
  const { onSelect, selectLabel } = props;
  if (!onSelect) {
    return (
      <li className="flex min-h-12 items-center justify-between gap-3 py-2">
        <RowContent {...props} />
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        aria-label={selectLabel}
        onClick={onSelect}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md py-2 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <RowContent {...props} />
      </button>
    </li>
  );
}
