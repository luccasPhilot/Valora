import { ArrowLeftRight, Receipt, Target, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { useNewTransaction } from '../transactions/new-transaction/new-transaction-provider';

const ITEM_CLASSES =
  'flex w-full flex-col items-center gap-2 rounded-lg p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring';
const ROUND_CLASSES =
  'flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors group-hover:bg-accent group-active:scale-[0.98] motion-reduce:group-active:scale-100';
const LABEL_CLASSES = 'text-xs leading-tight font-medium';

function ShortcutFace({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <>
      <span className={ROUND_CLASSES}>{icon}</span>
      <span className={LABEL_CLASSES}>{label}</span>
    </>
  );
}

/** Atalhos redondos do moodboard: dois abrem o formulário de lançamento, dois navegam. */
export function Shortcuts() {
  const { openNewTransaction } = useNewTransaction();
  return (
    <ul aria-label="Atalhos" className="grid grid-cols-4 gap-2">
      <li className="group flex">
        <button
          type="button"
          className={ITEM_CLASSES}
          onClick={() => openNewTransaction({ type: 'income' })}
        >
          <ShortcutFace
            icon={<TrendingUp className="size-6" aria-hidden="true" />}
            label="Adicionar receita"
          />
        </button>
      </li>
      <li className="group flex">
        <button
          type="button"
          className={ITEM_CLASSES}
          onClick={() => openNewTransaction({ type: 'expense' })}
        >
          <ShortcutFace
            icon={<Receipt className="size-6" aria-hidden="true" />}
            label="Registrar despesa"
          />
        </button>
      </li>
      <li className="group flex">
        <Link to="/transacoes" className={ITEM_CLASSES}>
          <ShortcutFace
            icon={<ArrowLeftRight className="size-6" aria-hidden="true" />}
            label="Transações"
          />
        </Link>
      </li>
      <li className="group flex">
        <Link to="/orcamentos" className={ITEM_CLASSES}>
          <ShortcutFace
            icon={<Target className="size-6" aria-hidden="true" />}
            label="Orçamentos"
          />
        </Link>
      </li>
    </ul>
  );
}
