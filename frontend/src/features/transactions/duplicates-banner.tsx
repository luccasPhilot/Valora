import { ChevronRight, Copy } from 'lucide-react';

interface DuplicatesBannerProps {
  count: number;
  onReview: () => void;
}

function describeCount(count: number): string {
  return count === 1
    ? '1 possível duplicata para conferir'
    : `${count} possíveis duplicatas para conferir`;
}

/** Faixa no topo de Transações: tocar nela filtra a lista só com as duplicatas pendentes. */
export function DuplicatesBanner({ count, onReview }: DuplicatesBannerProps) {
  return (
    <button
      type="button"
      onClick={onReview}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg bg-warning-surface px-4 py-3 text-left text-sm font-medium text-warning outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Copy className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{describeCount(count)}</span>
      <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
    </button>
  );
}
