import type { ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';

// Faixas do Design System: celular < 768 (painel de baixo), tablet < 1024 (painel lateral), computador (Dialog).
const PHONE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(max-width: 1023px)';

interface FormPanelProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  /** Seletor CSS do campo que recebe o foco ao abrir; sem ele vale o padrão do Radix (primeiro item). */
  focusOnOpenSelector?: string;
  children: ReactNode;
}

function focusFieldOnOpen(selector: string | undefined) {
  if (!selector) return undefined;
  return (event: Event) => {
    const field = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(selector);
    if (!field) return;
    event.preventDefault();
    field.focus();
  };
}

/** Formulário em painel: `Sheet` de baixo no celular, `Sheet` lateral no tablet, `Dialog` no computador. */
export function FormPanel({
  open,
  onOpenChange,
  title,
  description,
  focusOnOpenSelector,
  children,
}: FormPanelProps) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const onOpenAutoFocus = focusFieldOnOpen(focusOnOpenSelector);

  if (!isTablet) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onOpenAutoFocus={onOpenAutoFocus}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={onOpenAutoFocus}
        side={isPhone ? 'bottom' : 'right'}
        className={
          isPhone
            ? 'max-h-[92dvh] overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]'
            : 'w-full overflow-y-auto sm:max-w-md'
        }
      >
        <SheetHeader className="pr-12">
          <SheetTitle className="font-display text-xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
