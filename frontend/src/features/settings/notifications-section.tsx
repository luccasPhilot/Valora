import { Bell, Check, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { usePushNotifications } from './use-push-notifications';

interface SectionFrameProps {
  readonly children: ReactNode;
}

function SectionFrame({ children }: SectionFrameProps) {
  return (
    <section
      aria-labelledby="notifications-heading"
      className="space-y-3 rounded-lg border bg-card p-5 shadow-card"
    >
      <h2 id="notifications-heading" className="type-label flex items-center gap-2">
        <Bell className="size-4 text-primary" aria-hidden="true" />
        Notificações
      </h2>
      {children}
    </section>
  );
}

function Spinner() {
  return <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />;
}

/**
 * "Notificações", em Ajustes: o push deste aparelho. Some quando o servidor está sem chaves ou o
 * navegador não suporta push; no iPhone fora da tela de início, explica como instalar.
 */
export function NotificationsSection() {
  const push = usePushNotifications();

  if (push.state === 'hidden') return null;

  if (push.state === 'loading') {
    return (
      <SectionFrame>
        <div aria-hidden="true" className="space-y-3">
          <Skeleton className="h-4 w-full max-w-prose" />
          <Skeleton className="h-11 w-48" />
        </div>
      </SectionFrame>
    );
  }

  if (push.state === 'needs-install') {
    return (
      <SectionFrame>
        <p className="max-w-prose text-sm text-muted-foreground">
          Instale o Valora na tela de início para receber notificações. No Safari, toque em
          Compartilhar e depois em Adicionar à Tela de Início.
        </p>
      </SectionFrame>
    );
  }

  if (push.state === 'denied') {
    return (
      <SectionFrame>
        <p className="max-w-prose text-sm text-muted-foreground">
          As notificações estão bloqueadas neste aparelho. Para liberar, abra os ajustes do sistema
          (no iPhone: Ajustes, Notificações, Valora; no computador: as permissões do site) e volte
          aqui.
        </p>
      </SectionFrame>
    );
  }

  return (
    <SectionFrame>
      <p className="max-w-prose text-sm text-muted-foreground">
        Um aviso no aparelho quando surgir um alerta novo ou houver transações para revisar. O texto
        nunca leva valores nem nomes: ele só diz que há algo para ver no Valora.
      </p>
      {push.state === 'inactive' ? (
        <Button
          variant="outline"
          disabled={push.isEnabling}
          aria-busy={push.isEnabling}
          onClick={push.enable}
        >
          {push.isEnabling ? <Spinner /> : <Bell aria-hidden="true" />}
          Ativar neste aparelho
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Check className="size-4 text-positive" aria-hidden="true" />
            Ativado neste aparelho
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={push.isTesting}
              aria-busy={push.isTesting}
              onClick={push.sendTest}
            >
              {push.isTesting ? <Spinner /> : null}
              Enviar teste
            </Button>
            <Button
              variant="ghost"
              disabled={push.isDisabling}
              aria-busy={push.isDisabling}
              onClick={push.disable}
            >
              {push.isDisabling ? <Spinner /> : null}
              Desativar
            </Button>
          </div>
        </div>
      )}
      <div aria-live="polite">
        {push.enableError ? (
          <p role="alert" className="text-sm text-destructive">
            Não deu para ativar as notificações. Tente de novo.
          </p>
        ) : null}
        {push.hasTestFailed ? (
          <p role="alert" className="text-sm text-destructive">
            Não deu para enviar o teste. Tente de novo.
          </p>
        ) : null}
        {push.hasTestSucceeded && !push.hasTestFailed ? (
          <p className="text-sm text-muted-foreground">Teste enviado. Ele chega em instantes.</p>
        ) : null}
        {push.hasDisableFailed ? (
          <p role="alert" className="text-sm text-destructive">
            Não deu para desativar. Tente de novo.
          </p>
        ) : null}
      </div>
    </SectionFrame>
  );
}
