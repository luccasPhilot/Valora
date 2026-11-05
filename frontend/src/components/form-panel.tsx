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
  children: ReactNode;
}

/** Formulário em painel: `Sheet` de baixo no celular, `Sheet` lateral no tablet, `Dialog` no computador. */
export function FormPanel({ open, onOpenChange, title, description, children }: FormPanelProps) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);

  if (!isTablet) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
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
