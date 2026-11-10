import { useRegisterSW } from 'virtual:pwa-register/react';

import { UpdateBanner } from './update-banner';

/** Registra o service worker e mostra o aviso quando há versão nova esperando. */
export function UpdatePrompt() {
  const {
    needRefresh: [isUpdateAvailable],
    updateServiceWorker,
  } = useRegisterSW();
  return (
    <UpdateBanner
      isUpdateAvailable={isUpdateAvailable}
      onUpdate={() => void updateServiceWorker(true)}
    />
  );
}
