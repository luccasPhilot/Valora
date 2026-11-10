import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';

import { useSetConnectionArchived } from './accounts-queries';

export const ARCHIVE_BANK_LABEL = 'Remover do Valora';

const ARCHIVE_ERROR_MESSAGE = 'Não foi possível remover o banco. Tente de novo.';

interface ArchiveBankButtonProps {
  connectionId: string;
  institutionName: string;
  className?: string;
}

/**
 * "Remover do Valora": arquiva o banco inteiro depois de uma confirmação. Nada é apagado: o banco
 * sai das listas, do saldo, dos avisos e da sincronização, e dá para reativá-lo em "Arquivados".
 */
export function ArchiveBankButton({
  connectionId,
  institutionName,
  className,
}: ArchiveBankButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const archive = useSetConnectionArchived();

  function handleOpenChange(nextIsOpen: boolean) {
    if (!nextIsOpen) archive.reset();
    setIsOpen(nextIsOpen);
  }

  return (
    <>
      <Button type="button" variant="outline" className={className} onClick={() => setIsOpen(true)}>
        {ARCHIVE_BANK_LABEL}
      </Button>
      <ConfirmDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        title={`Remover ${institutionName} do Valora?`}
        description="O banco sai do saldo total, das listas e dos avisos. O histórico fica guardado e você pode reativá-lo em Arquivados."
        confirmLabel={ARCHIVE_BANK_LABEL}
        confirmVariant="default"
        isPending={archive.isPending}
        errorMessage={archive.isError ? ARCHIVE_ERROR_MESSAGE : null}
        onConfirm={() => archive.mutate({ connectionId, isArchived: true })}
      />
    </>
  );
}
