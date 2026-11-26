import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  fetchPushPublicKey,
  pushSubscriptionJsonSchema,
  registerPushSubscription,
  removePushSubscription,
  sendPushTest,
} from '@/lib/api/push';
import { queryKeys } from '@/lib/query-keys';

import { applicationServerKeyFrom, isPushSupported, needsInstallForPush } from './push-support';

export type PushViewState =
  'loading' | 'hidden' | 'needs-install' | 'denied' | 'inactive' | 'active';

type SubscriptionPresence = 'unknown' | 'present' | 'absent';

class PushPermissionDeniedError extends Error {
  constructor() {
    super('A permissão de notificações foi negada neste aparelho');
    this.name = 'PushPermissionDeniedError';
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function subscribeThisDevice(
  publicKey: string,
  permissionRequest: Promise<NotificationPermission>,
): Promise<void> {
  if ((await permissionRequest) !== 'granted') throw new PushPermissionDeniedError();
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKeyFrom(publicKey),
  });
  try {
    await registerPushSubscription(pushSubscriptionJsonSchema.parse(subscription.toJSON()));
  } catch (error) {
    // Sem o registro no servidor a inscrição não serve: não deixa o aparelho "ativado" pela metade.
    await subscription.unsubscribe();
    throw error;
  }
}

async function unsubscribeThisDevice(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await removePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}

function viewStateOf(
  publicKey: ReturnType<typeof usePublicKey>,
  presence: SubscriptionPresence,
  permission: NotificationPermission | null,
): PushViewState {
  if (publicKey.isPending) return 'loading';
  if (publicKey.isError || !publicKey.data) return 'hidden';
  if (!isPushSupported()) return needsInstallForPush() ? 'needs-install' : 'hidden';
  if (presence === 'present') return 'active';
  if (permission === 'denied') return 'denied';
  return presence === 'unknown' ? 'loading' : 'inactive';
}

function usePublicKey() {
  return useQuery({
    queryKey: queryKeys.pushPublicKey,
    queryFn: fetchPushPublicKey,
    retry: false,
    staleTime: Infinity,
  });
}

/** O estado das notificações neste aparelho e as três ações de Ajustes. */
export function usePushNotifications() {
  const publicKey = usePublicKey();
  const [presence, setPresence] = useState<SubscriptionPresence>('unknown');
  const [permission, setPermission] = useState<NotificationPermission | null>(
    isPushSupported() ? Notification.permission : null,
  );

  useEffect(() => {
    if (!isPushSupported()) return;
    void currentSubscription().then((subscription) =>
      setPresence(subscription ? 'present' : 'absent'),
    );
  }, []);

  const enable = useMutation({
    // Fora do mapa de invalidação: a inscrição vive no navegador e no servidor, nenhuma tela muda.
    mutationFn: (permissionRequest: Promise<NotificationPermission>) =>
      subscribeThisDevice(publicKey.data ?? '', permissionRequest),
    onSuccess: () => setPresence('present'),
    onSettled: () => setPermission(Notification.permission),
  });

  const disable = useMutation({
    // Fora do mapa de invalidação: só remove a inscrição deste aparelho.
    mutationFn: unsubscribeThisDevice,
    onSuccess: () => setPresence('absent'),
  });

  const test = useMutation({
    // Fora do mapa de invalidação: manda uma notificação de teste, sem gravar nada.
    mutationFn: sendPushTest,
  });

  return {
    state: viewStateOf(publicKey, presence, permission),
    enable: () => enable.mutate(Notification.requestPermission()),
    disable: () => disable.mutate(),
    sendTest: () => test.mutate(),
    isEnabling: enable.isPending,
    isDisabling: disable.isPending,
    isTesting: test.isPending,
    enableError: enable.error,
    hasDisableFailed: disable.isError,
    hasTestFailed: test.isError,
    hasTestSucceeded: test.isSuccess,
  };
}
