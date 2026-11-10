import { Eye, EyeOff, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { FormPanel } from '@/components/form-panel';
import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import type { Account } from '@/lib/api/accounts';

import { ACCOUNT_TYPE_LABELS } from './account-groups';

interface AccountPanelProps {
  /** Nulo com o painel fechado. */
  account: Account | null;
  isSaving: boolean;
  hasSaveError: boolean;
  onToggleHidden: (account: Account) => void;
  onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium break-words">{children}</dd>
    </div>
  );
}

function AccountDetails({ account }: { account: Account }) {
  const isCreditCard = account.type === 'credit_card';
  return (
    <dl className="divide-y divide-border">
      <DetailRow label="Tipo">{ACCOUNT_TYPE_LABELS[account.type]}</DetailRow>
      {account.lastDigits ? <DetailRow label="Final">{account.lastDigits}</DetailRow> : null}
      <DetailRow label={isCreditCard ? 'Fatura atual' : 'Saldo'}>
        <Money cents={account.balanceCents ?? 0} />
      </DetailRow>
      {isCreditCard && account.creditLimitCents !== null ? (
        <DetailRow label="Limite total">
          <Money cents={account.creditLimitCents} />
        </DetailRow>
      ) : null}
      {isCreditCard && account.availableLimitCents !== null ? (
        <DetailRow label="Limite disponível">
          <Money cents={account.availableLimitCents} />
        </DetailRow>
      ) : null}
      <DetailRow label="Nos totais">{account.isHidden ? 'Não' : 'Sim'}</DetailRow>
    </dl>
  );
}

/** Detalhe da conta, com a opção de tirá-la (ou devolvê-la) dos totais. */
export function AccountPanel({
  account,
  isSaving,
  hasSaveError,
  onToggleHidden,
  onClose,
}: AccountPanelProps) {
  const ToggleIcon = account?.isHidden ? Eye : EyeOff;
  return (
    <FormPanel
      open={account !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={account?.name ?? 'Conta'}
      description={account?.connection?.institutionName ?? 'Detalhes da conta'}
    >
      {account ? (
        <div className="space-y-5">
          <AccountDetails account={account} />
          {account.type === 'credit_card' ? (
            <Button asChild variant="secondary" className="w-full">
              <Link to={`/contas/${account.id}/faturas`}>
                <FileText aria-hidden="true" />
                Ver faturas
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isSaving}
            onClick={() => onToggleHidden(account)}
          >
            <ToggleIcon aria-hidden="true" />
            {account.isHidden ? 'Mostrar nos totais' : 'Ocultar dos totais'}
          </Button>
          {hasSaveError ? (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível atualizar a conta. Tente de novo.
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Uma conta oculta continua na lista, mas não entra no saldo total nem nas faturas em
            aberto.
          </p>
        </div>
      ) : null}
    </FormPanel>
  );
}
