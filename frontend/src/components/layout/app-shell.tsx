import { Suspense, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';

import { ConnectionAlert } from '@/components/connection-alert';
import { OfflineBanner } from '@/components/offline-banner';
import { ScreenSkeleton } from '@/components/states/skeletons';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { UpdatePrompt } from '@/components/update-prompt';
import { NewTransactionButton } from '@/features/transactions/new-transaction/new-transaction-button';
import { NewTransactionProvider } from '@/features/transactions/new-transaction/new-transaction-provider';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useMenuHistory } from '@/hooks/use-menu-history';
import { useSidebarPreference } from '@/hooks/use-sidebar-preference';
import { findScreenTitle, isInsideReports } from '@/lib/areas';

import { AppSidebar } from './app-sidebar';
import { ScreenHeader } from './screen-header';

const FALLBACK_TITLE = 'Valora';
const TRANSACTIONS_PATH = '/transacoes';
const CONTENT_ID = 'conteudo';

export function AppShell() {
  const { pathname } = useLocation();
  const screenTitle = findScreenTitle(pathname);
  const title = screenTitle ?? FALLBACK_TITLE;
  // Os relatórios põem o próprio título na aba ("Por categoria | Relatórios"), então o menu não repete.
  useDocumentTitle(isInsideReports(pathname) ? undefined : screenTitle);
  const { isSidebarOpen, setSidebarOpen } = useSidebarPreference();
  const { isMenuOpen, setMenuOpen } = useMenuHistory();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <NewTransactionProvider>
      <SidebarProvider
        open={isSidebarOpen}
        onOpenChange={setSidebarOpen}
        openMobile={isMenuOpen}
        onOpenMobileChange={setMenuOpen}
      >
        <a
          href={`#${CONTENT_ID}`}
          onClick={(event) => {
            // Sem isto o endereço ganharia um "#conteudo" e uma entrada nova no histórico.
            event.preventDefault();
            contentRef.current?.focus();
          }}
          className="sr-only rounded-sm bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:outline-hidden"
        >
          Pular para o conteúdo
        </a>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <ScreenHeader
            title={title}
            actions={pathname === TRANSACTIONS_PATH ? <NewTransactionButton /> : undefined}
          />
          <OfflineBanner />
          <UpdatePrompt />
          <ConnectionAlert />
          <div
            ref={contentRef}
            id={CONTENT_ID}
            tabIndex={-1}
            className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] focus:outline-hidden sm:px-6 lg:px-8"
          >
            <Suspense fallback={<ScreenSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </NewTransactionProvider>
  );
}
