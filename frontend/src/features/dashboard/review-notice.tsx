import { ChevronRight, Inbox } from 'lucide-react';
import { Link } from 'react-router';

import { REVIEW_INBOX_PATH } from '../transactions/transactions-views-nav';

interface ReviewNoticeProps {
  count: number;
}

/** Aviso discreto acima dos cartões: some com a caixa zerada e leva à caixa "Para revisar". */
export function ReviewNotice({ count }: ReviewNoticeProps) {
  if (count === 0) return null;
  return (
    <Link
      to={REVIEW_INBOX_PATH}
      className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-card outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Inbox className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1 tabular-nums">{count} para revisar</span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
