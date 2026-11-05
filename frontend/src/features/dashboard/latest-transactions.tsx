import { ArrowLeftRight } from 'lucide-react';
import { useNavigate } from 'react-router';

import type { Transaction } from '@/lib/api/transactions';

import { TransactionItem } from '../transactions/transaction-item';
import { DashboardSection, SectionEmpty, SectionLink } from './dashboard-section';

const TRANSACTIONS_PATH = '/transacoes';

/** As 5 últimas transações, de qualquer origem. Tocar numa leva à lista completa. */
export function LatestTransactions({ transactions }: { transactions: readonly Transaction[] }) {
  const navigate = useNavigate();
  return (
    <DashboardSection
      title="Últimas transações"
      icon={ArrowLeftRight}
      action={<SectionLink to={TRANSACTIONS_PATH}>Ver todas</SectionLink>}
    >
      {transactions.length === 0 ? (
        <SectionEmpty message="Nenhuma transação ainda" />
      ) : (
        <ul className="-mx-2">
          {transactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              layout="stacked"
              onOpen={() => void navigate(TRANSACTIONS_PATH)}
            />
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
