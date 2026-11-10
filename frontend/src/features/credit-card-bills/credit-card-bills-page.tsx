import { ArrowLeft, CreditCard } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { CardSkeleton } from '@/components/states/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

import { useCreditCardBills } from './credit-card-bills-queries';
import { CurrentBillCard } from './current-bill-card';
import { FutureInstallments } from './future-installments';
import { UpcomingBills } from './upcoming-bills';

const ACCOUNTS_PATH = '/contas';

function BillsSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-4">
      <CardSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}

function BackToAccounts() {
  return (
    <Link
      to={ACCOUNTS_PATH}
      className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Contas
    </Link>
  );
}

function CardNotFound() {
  return (
    <EmptyState
      icon={CreditCard}
      title="Cartão não encontrado"
      description="Este cartão não existe ou está fora dos totais. Volte para Contas e escolha outro."
      action={<BackToAccounts />}
    />
  );
}

/** Faturas de um cartão: a atual, as próximas e as parcelas futuras por mês. */
export function Component() {
  const { accountId } = useParams();
  const billsQuery = useCreditCardBills();

  if (billsQuery.isPending) return <BillsSkeleton />;
  if (billsQuery.isError) return <ErrorState onRetry={() => void billsQuery.refetch()} />;

  const card = billsQuery.data.find((candidate) => candidate.accountId === accountId);
  if (!card) return <CardNotFound />;

  return (
    <div className="space-y-4">
      <BackToAccounts />
      <CurrentBillCard card={card} />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <UpcomingBills bills={card.upcomingBills} />
        <FutureInstallments months={card.futureInstallments} />
      </div>
    </div>
  );
}
