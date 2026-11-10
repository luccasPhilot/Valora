import { useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { formatDayMonthAtTime } from '@/lib/format';
import { OFFLINE_ACTION_HINT, useConnectivity } from '@/lib/pwa/connectivity';

const UNKNOWN_AGE_TEXT = 'Sem conexão. Os dados na tela podem estar desatualizados.';

/** Quando a rede volta, tudo o que estava na tela é consultado de novo. */
function useRefetchWhenBackOnline(isOnline: boolean): void {
  const queryClient = useQueryClient();
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (!wasOnline.current && isOnline) void queryClient.invalidateQueries();
    wasOnline.current = isOnline;
  }, [isOnline, queryClient]);
}

/**
 * Faixa no topo enquanto o app está sem rede ou mostrando dados guardados. Diz de quando são os
 * dados: número antigo nunca aparece como se fosse de agora.
 */
export function OfflineBanner() {
  const { isOnline, isServerUnreachable, cachedAt, hasBlockedWrite } = useConnectivity();
  useRefetchWhenBackOnline(isOnline);

  const isShowingOldData = cachedAt !== null;
  if (isOnline && !isServerUnreachable && !isShowingOldData) return null;

  const dataAge = isShowingOldData
    ? `Sem conexão. Mostrando os dados de ${formatDayMonthAtTime(cachedAt)}.`
    : UNKNOWN_AGE_TEXT;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-6 lg:px-8">
      <div
        role="status"
        className="flex min-h-11 w-full items-start gap-3 rounded-lg bg-warning-surface px-4 py-3 text-sm font-medium text-warning"
      >
        <WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">
          {dataAge}
          {hasBlockedWrite || !isOnline ? (
            <span className="mt-1 block">{OFFLINE_ACTION_HINT}</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
