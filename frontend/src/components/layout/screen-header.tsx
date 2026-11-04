import { HideValuesButton } from '@/components/hide-values-button';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface ScreenHeaderProps {
  title: string;
}

export function ScreenHeader({ title }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 w-full lg:h-[72px] max-w-[1200px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <SidebarTrigger className="-ml-2 size-11 rounded-full lg:hidden" aria-label="Abrir menu" />
        <h1 className="min-w-0 truncate font-display text-2xl font-bold tracking-tight">{title}</h1>
        {/* Espaço do status da sincronização, preenchido pela change accounts-screen. */}
        <div data-slot="sync-status" className="ml-auto flex items-center gap-2" />
        <HideValuesButton />
      </div>
    </header>
  );
}
