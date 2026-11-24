import { useEffect } from 'react';
import { useRouteError } from 'react-router';

import { markChunkReload, shouldReloadForChunkError } from '@/lib/chunk-load-error';
import { reloadPage } from '@/lib/page-reload';

/**
 * Quando o erro da rota é um arquivo de tela que não carregou, recarrega a página uma vez (a versão
 * nova costuma resolver) e devolve `true` enquanto isso. Qualquer outro erro devolve `false`.
 */
export function useRouteErrorRecovery(): boolean {
  const error = useRouteError();
  const isReloading = shouldReloadForChunkError(error, Date.now());

  useEffect(() => {
    if (!isReloading) return;
    markChunkReload(Date.now());
    reloadPage();
  }, [isReloading]);

  return isReloading;
}
