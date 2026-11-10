import type { OrphanCause } from '@/lib/connection-status';

const EXPLANATIONS: Readonly<Record<OrphanCause, string>> = {
  removed_from_pluggy:
    'Este banco foi removido do Meu Pluggy, então não há mais o que sincronizar. Remova-o do Valora para tirá-lo do saldo e dos avisos; o histórico fica guardado.',
  not_in_sync_list:
    'O id deste banco não está mais na lista de sincronização do servidor (PLUGGY_ITEM_IDS), então ele não é lido. Se o banco ainda existe no Meu Pluggy, ponha o id de volta na lista; se não, remova-o do Valora e o histórico fica guardado.',
};

/** Explica por que um banco órfão parou de sincronizar. O botão de remover fica ao lado. */
export function OrphanHelp({ cause }: { cause: OrphanCause }) {
  return (
    <p className="rounded-md bg-warning-surface p-3 text-sm text-warning">{EXPLANATIONS[cause]}</p>
  );
}
