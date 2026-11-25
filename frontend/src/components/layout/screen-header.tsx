import type { ReactNode } from 'react';

import { HideValuesButton } from '@/components/hide-values-button';
import { SyncStatus } from '@/components/sync-status';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { AlertsBell } from '@/features/alerts/alerts-bell';

interface ScreenHeaderProps {
  title: string;
  /** Ações da tela, antes do botão de ocultar valores (por exemplo, "Nova transação"). */
  actions?: ReactNode;
}

export function ScreenHeader({ title, actions }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background pt-[env(safe-area-inset-top)]">
      {/*
        Abaixo de 390 px os botões (44 px cada) comem o espaço do título: sem gap, margem menor e título
        em text-xl. Abaixo de 360 px, 19 px: "Saúde dos dados" cabe inteiro a 320 px.
      */}
      <div className="mx-auto flex min-h-14 w-full max-w-content flex-wrap items-center gap-0 px-3 max-[359px]:pb-3 min-[360px]:h-14 min-[390px]:gap-2 min-[390px]:px-4 sm:px-6 lg:h-18 lg:px-8">
        <SidebarTrigger className="-ml-2 size-11 rounded-full lg:hidden" aria-label="Abrir menu" />
        {/*
          Celular: o status fica embaixo do título, para o título nunca ser cortado. Abaixo de 360 px ele
          desce para uma linha própria, na largura toda (o título não divide espaço com ele e o sino
          continua no topo). A partir de sm, à direita do título.
        */}
        <div className="flex min-w-0 flex-1 flex-col items-start max-[359px]:contents sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <h1 className="max-w-full min-w-0 truncate font-display text-xl font-bold tracking-tight max-[359px]:flex-1 max-[359px]:text-[1.1875rem] min-[390px]:text-2xl">
            {title}
          </h1>
          <div
            data-slot="sync-status"
            className="flex max-w-full min-w-0 items-center max-[359px]:order-last max-[359px]:basis-full max-[359px]:pl-9"
          >
            <SyncStatus />
          </div>
        </div>
        {actions}
        <AlertsBell />
        <HideValuesButton />
      </div>
    </header>
  );
}
