import { CircleCheck, TriangleAlert } from 'lucide-react';

import type { Notice } from '@/hooks/use-notice';

interface NoticeRegionProps {
  notice: Notice | null;
}

/** Área fixa que anuncia o aviso aos leitores de tela; o ícone reforça o que a cor sozinha diria. */
export function NoticeRegion({ notice }: NoticeRegionProps) {
  const Icon = notice?.tone === 'error' ? TriangleAlert : CircleCheck;
  const iconColor = notice?.tone === 'error' ? 'text-destructive' : 'text-positive';
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[60] flex justify-center"
    >
      {notice ? (
        <p className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg border bg-popover px-4 py-3 text-sm font-medium text-popover-foreground shadow-overlay">
          <Icon className={`size-5 shrink-0 ${iconColor}`} aria-hidden="true" />
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
