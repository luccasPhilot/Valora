import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  onRetry: () => void;
  message?: string;
}

const DEFAULT_ERROR_MESSAGE = 'Não foi possível carregar esta tela.';

// Mensagem simples, sem detalhes técnicos: o motivo real fica nos logs, não na interface.
export function ErrorState({ onRetry, message = DEFAULT_ERROR_MESSAGE }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-12 text-center shadow-card"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-warning-surface text-destructive">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <p className="text-xl font-semibold font-display">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}
