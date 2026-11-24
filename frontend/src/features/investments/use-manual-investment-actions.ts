import { useState } from 'react';

import { useNotice } from '@/hooks/use-notice';
import type { ManualInvestmentChanges, ManualInvestmentInput } from '@/lib/api/investments';
import { todayInSaoPaulo } from '@/lib/dates';

import type { RankedPosition } from './investment-view';
import {
  useCreateInvestment,
  useDeleteInvestment,
  useUpdateInvestment,
} from './investments-queries';
import type { EditableInvestment, ManualInvestmentPanelTarget } from './manual-investment-panel';
import { describeManualUpdate } from './manual-investment-values';

const SAVE_ERROR_MESSAGE = 'Não foi possível salvar o investimento. Tente de novo.';
const CLOSE_ERROR_MESSAGE = 'Não foi possível encerrar a posição. Tente de novo.';
const REMOVE_ERROR_MESSAGE = 'Não foi possível excluir o investimento. Tente de novo.';

export function toEditable(position: RankedPosition, today: string): EditableInvestment {
  return {
    id: position.id,
    name: position.name,
    institutionName: position.institutionName,
    type: position.type,
    balanceCents: position.balanceCents,
    updateText: describeManualUpdate(position.balanceUpdatedOn, today).text,
  };
}

/** Painel, confirmação de exclusão e avisos das posições manuais; a tela só liga isso aos botões. */
export function useManualInvestmentActions() {
  const createInvestment = useCreateInvestment();
  const updateInvestment = useUpdateInvestment();
  const deleteInvestment = useDeleteInvestment();
  const { notice, showNotice } = useNotice();
  const [panelTarget, setPanelTarget] = useState<ManualInvestmentPanelTarget | null>(null);
  const [closeTarget, setCloseTarget] = useState<EditableInvestment | null>(null);
  const [removeTarget, setRemoveTarget] = useState<EditableInvestment | null>(null);

  function openPanel(target: ManualInvestmentPanelTarget | null) {
    createInvestment.reset();
    updateInvestment.reset();
    setPanelTarget(target);
  }

  function finishSaving(message: string) {
    setPanelTarget(null);
    showNotice({ tone: 'success', message });
  }

  function create(input: ManualInvestmentInput) {
    createInvestment.mutate(input, {
      onSuccess: (created) => finishSaving(`${created.name} adicionado`),
    });
  }

  function update(id: string, changes: ManualInvestmentChanges) {
    // Nada mudou: não há o que enviar, só fecha.
    if (Object.keys(changes).length === 0) {
      setPanelTarget(null);
      return;
    }
    updateInvestment.mutate(
      { id, changes },
      { onSuccess: (saved) => finishSaving(`${saved.name} atualizado`) },
    );
  }

  // Encerrar tira a posição da lista e a tela não tem como reabri-la, por isso pede confirmação.
  function askClose(investment: EditableInvestment) {
    updateInvestment.reset();
    setCloseTarget(investment);
  }

  function confirmClose() {
    if (!closeTarget) return;
    updateInvestment.mutate(
      { id: closeTarget.id, changes: { balanceCents: 0 } },
      {
        onSuccess: (saved) => {
          setCloseTarget(null);
          finishSaving(`${saved.name} encerrado`);
        },
      },
    );
  }

  function askRemove(investment: EditableInvestment) {
    deleteInvestment.reset();
    setRemoveTarget(investment);
  }

  function confirmRemove() {
    if (!removeTarget) return;
    deleteInvestment.mutate(removeTarget.id, {
      onSuccess: () => {
        const { name } = removeTarget;
        setRemoveTarget(null);
        setPanelTarget(null);
        showNotice({ tone: 'success', message: `${name} excluído` });
      },
    });
  }

  const hasSaveError = createInvestment.isError || updateInvestment.isError;
  return {
    notice,
    panelTarget,
    closeTarget,
    removeTarget,
    isSaving: createInvestment.isPending || updateInvestment.isPending,
    // O erro ao encerrar aparece na confirmação, não no painel atrás dela.
    saveErrorMessage: hasSaveError && !closeTarget ? SAVE_ERROR_MESSAGE : null,
    closeErrorMessage: updateInvestment.isError && closeTarget ? CLOSE_ERROR_MESSAGE : null,
    isRemoving: deleteInvestment.isPending,
    removeErrorMessage: deleteInvestment.isError ? REMOVE_ERROR_MESSAGE : null,
    openCreate: () => openPanel({ kind: 'create' }),
    openEdit: (investment: EditableInvestment) => openPanel({ kind: 'edit', investment }),
    dismissPanel: () => openPanel(null),
    cancelClose: () => {
      updateInvestment.reset();
      setCloseTarget(null);
    },
    cancelRemove: () => setRemoveTarget(null),
    create,
    update,
    askClose,
    confirmClose,
    askRemove,
    confirmRemove,
    today: todayInSaoPaulo(),
  };
}
