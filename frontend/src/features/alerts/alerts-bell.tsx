import { Bell } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';

import { describeBellLabel, formatUnreadBadge } from './alert-presentation';
import { AlertsPanel } from './alerts-panel';
import { useAlerts } from './alerts-queries';

// Faixa do Design System: celular < 768 px abre uma folha de baixo; a partir daí, um painel ancorado.
const PHONE_QUERY = '(max-width: 767px)';

interface BellButtonProps extends ComponentProps<typeof Button> {
  unreadCount: number;
}

function BellButton({ unreadCount, ...props }: BellButtonProps) {
  const badge = formatUnreadBadge(unreadCount);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative size-11 rounded-full"
      aria-label={describeBellLabel(unreadCount)}
      {...props}
    >
      <Bell className="size-5" aria-hidden="true" />
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-semibold text-primary-foreground tabular-nums"
        >
          {badge}
        </span>
      ) : null}
    </Button>
  );
}

/** O sino do topo: contador de não lidos e o painel com a lista de alertas. */
export function AlertsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const unreadCount = useAlerts().data?.unreadCount ?? 0;
  const close = () => setIsOpen(false);

  if (isPhone) {
    return (
      <>
        <BellButton
          unreadCount={unreadCount}
          aria-haspopup="dialog"
          onClick={() => setIsOpen(true)}
        />
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] gap-0 rounded-t-xl pb-[env(safe-area-inset-bottom)]"
          >
            <SheetTitle className="sr-only">Alertas</SheetTitle>
            <SheetDescription className="sr-only">
              Avisos sobre orçamentos e conexões com bancos
            </SheetDescription>
            <AlertsPanel hasCloseButton onOpenAlert={close} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <BellButton unreadCount={unreadCount} />
      </PopoverTrigger>
      <PopoverContent
        aria-label="Alertas"
        className="flex max-h-[min(32rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
      >
        <AlertsPanel onOpenAlert={close} />
      </PopoverContent>
    </Popover>
  );
}
