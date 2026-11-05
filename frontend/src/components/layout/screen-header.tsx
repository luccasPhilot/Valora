import type { ReactNode } from 'react';

import { HideValuesButton } from '@/components/hide-values-button';
import { SyncStatus } from '@/components/sync-status';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface ScreenHeaderProps {
  title: string;
  /** Ações da tela, antes do botão de ocultar valores (por exemplo, "Nova transação"). */
  actions?: ReactNode;
}

export function ScreenHeader({ title, actions }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 w-full lg:h-[72px] max-w-[1200px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <SidebarTrigger className="-ml-2 size-11 rounded-full lg:hidden" aria-label="Abrir menu" />
        {/* Celular: o status fica embaixo do título, para o título nunca ser cortado. A partir de sm, à direita. */}
        <div className="flex min-w-0 flex-1 flex-col items-start sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <h1 className="max-w-full min-w-0 truncate font-display text-2xl font-bold tracking-tight">
            {title}
          </h1>
          <div data-slot="sync-status" className="flex max-w-full min-w-0 items-center">
            <SyncStatus />
          </div>
        </div>
        {actions}
        <HideValuesButton />
      </div>
    </header>
  );
}
