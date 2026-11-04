import { HideValuesButton } from '@/components/hide-values-button';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface ScreenHeaderProps {
  title: string;
}

export function ScreenHeader({ title }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <SidebarTrigger className="-ml-2 size-11 lg:hidden" aria-label="Abrir menu" />
        <h1 className="min-w-0 truncate text-xl font-bold">{title}</h1>
        {/* Espaço do status da sincronização, preenchido pela change accounts-screen. */}
        <div data-slot="sync-status" className="ml-auto flex items-center gap-2" />
        <HideValuesButton />
      </div>
    </header>
  );
}
