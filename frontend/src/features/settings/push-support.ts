/** O que o navegador deste aparelho consegue fazer com push. Sem estado: lê a janela na hora. */

const IOS_DEVICE_PATTERN = /iPhone|iPad|iPod/;

interface StandaloneNavigator extends Navigator {
  readonly standalone?: boolean;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** O app aberto pelo ícone da tela de início, não numa aba do navegador. */
export function isInstalledApp(): boolean {
  const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
  return isStandaloneDisplay || (navigator as StandaloneNavigator).standalone === true;
}

/** No iPhone, o Safari só libera push para o app instalado na tela de início (iOS 16.4 ou mais novo). */
export function needsInstallForPush(): boolean {
  return IOS_DEVICE_PATTERN.test(navigator.userAgent) && !isInstalledApp();
}

/** A chave VAPID chega em base64 de URL; o `subscribe` quer os bytes. */
export function applicationServerKeyFrom(publicKey: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
  const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
