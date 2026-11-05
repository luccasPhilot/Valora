import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';

import { ConnectionAlert } from '@/components/connection-alert';
import { ScreenSkeleton } from '@/components/states/skeletons';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { NewTransactionButton } from '@/features/transactions/new-transaction/new-transaction-button';
import { NewTransactionProvider } from '@/features/transactions/new-transaction/new-transaction-provider';
import { useSidebarPreference } from '@/hooks/use-sidebar-preference';
import { findAreaByPath } from '@/lib/areas';

import { AppSidebar } from './app-sidebar';
import { ScreenHeader } from './screen-header';

const FALLBACK_TITLE = 'Valora';
const TRANSACTIONS_PATH = '/transacoes';

export function AppShell() {
  const { pathname } = useLocation();
  const title = findAreaByPath(pathname)?.title ?? FALLBACK_TITLE;
  const { isSidebarOpen, setSidebarOpen } = useSidebarPreference();

  return (
    <NewTransactionProvider>
      <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <ScreenHeader
            title={title}
            actions={pathname === TRANSACTIONS_PATH ? <NewTransactionButton /> : undefined}
          />
          <ConnectionAlert />
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
            <Suspense fallback={<ScreenSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NewTransactionProvider>
  );
}
