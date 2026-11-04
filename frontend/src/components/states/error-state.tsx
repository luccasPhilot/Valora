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
      className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-12 text-center"
    >
      <TriangleAlert className="size-8 text-destructive" aria-hidden="true" />
      <p className="font-medium">{message}</p>
      <Button variant="outline" className="min-h-11" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}
