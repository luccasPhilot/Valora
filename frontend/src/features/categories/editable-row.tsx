import { cn } from 'cn';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface EditableRowProps {
  /** Nome do botão de editar, com o item: "Editar regra UBER". */
  editLabel: string;
  onEdit: () => void;
  /** A outra ação da linha (excluir, arquivar), por cima da área de toque da edição. */
  action: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Linha de lista que abre a edição ao tocar em qualquer lugar dela. O texto da linha continua sendo
 * lido como texto: só o botão de editar tem nome, e a área de toque dele se estende pela linha toda.
 */
export function EditableRow({ editLabel, onEdit, action, className, children }: EditableRowProps) {
  return (
    <li
      className={cn('relative flex items-center gap-1 rounded-md py-1 hover:bg-accent', className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {/* Sem `scale` no toque: qualquer valor (até 100%) torna o botão a referência do `after`, que encolhe e perde o clique. */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full after:absolute after:inset-0 after:rounded-md active:scale-none motion-reduce:active:scale-none"
        aria-label={editLabel}
        onClick={onEdit}
      >
        <Pencil className="size-5" aria-hidden="true" />
      </Button>
      <div className="relative">{action}</div>
    </li>
  );
}
