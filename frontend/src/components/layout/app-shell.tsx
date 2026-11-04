import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';

import { ScreenSkeleton } from '@/components/states/skeletons';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { findAreaByPath } from '@/lib/areas';

import { AppSidebar } from './app-sidebar';
import { ScreenHeader } from './screen-header';

const FALLBACK_TITLE = 'Valora';

export function AppShell() {
  const { pathname } = useLocation();
  const title = findAreaByPath(pathname)?.title ?? FALLBACK_TITLE;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <ScreenHeader title={title} />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
          <Suspense fallback={<ScreenSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
