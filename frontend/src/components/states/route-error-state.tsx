import { useRouteErrorRecovery } from '@/hooks/use-route-error-recovery';
import { reloadPage } from '@/lib/page-reload';

import { ErrorState } from './error-state';
import { AppLoadingSkeleton, ScreenSkeleton } from './skeletons';

const ROUTE_ERROR_MESSAGE = 'Algo deu errado nesta tela';

// Numa exceção de desenho, recarregar a página é o único jeito garantido de limpar o estado. O motivo
// técnico (nome, mensagem, stack) nunca aparece na tela: o React Router já o registra no console.

/** Erro de uma área: aparece no lugar da tela, com o menu e o topo ainda de pé. */
export function RouteErrorState() {
  const isReloading = useRouteErrorRecovery();
  if (isReloading) return <ScreenSkeleton />;
  return <ErrorState message={ROUTE_ERROR_MESSAGE} onRetry={reloadPage} />;
}

/** Erro no próprio shell ou fora dele: ocupa a tela inteira, como a página "não encontrada". */
export function FullPageRouteErrorState() {
  const isReloading = useRouteErrorRecovery();
  if (isReloading) return <AppLoadingSkeleton />;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md">
        <ErrorState message={ROUTE_ERROR_MESSAGE} onRetry={reloadPage} />
      </div>
    </main>
  );
}
