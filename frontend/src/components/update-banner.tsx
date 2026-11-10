import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface UpdateBannerProps {
  isUpdateAvailable: boolean;
  onUpdate: () => void;
}

/** Aviso de versão nova. A versão só troca (e a página só recarrega) quando o usuário toca em "Atualizar". */
export function UpdateBanner({ isUpdateAvailable, onUpdate }: UpdateBannerProps) {
  if (!isUpdateAvailable) return null;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-6 lg:px-8">
      <div
        role="status"
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
      >
        <RefreshCw className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="min-w-0 flex-1">Nova versão disponível</p>
        <Button type="button" onClick={onUpdate}>
          Atualizar
        </Button>
      </div>
    </div>
  );
}
