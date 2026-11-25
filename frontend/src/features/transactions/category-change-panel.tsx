import { FormPanel } from '@/components/form-panel';
import type { Category } from '@/lib/api/categories';

import { CategoryPicker } from './category-picker';

interface CategoryChangePanelProps {
  open: boolean;
  title: string;
  description: string;
  categories: readonly Category[];
  currentCategoryId: string | null;
  /** Só na troca de uma transação: a troca em massa não cria regra. */
  applyAlwaysLabel?: string;
  onClose: () => void;
  onPick: (category: Category, applyAlways: boolean) => void;
}

/** Só a busca de categorias, sem o resto do detalhe: "Trocar categoria" da caixa e da seleção. */
export function CategoryChangePanel({
  open,
  title,
  description,
  categories,
  currentCategoryId,
  applyAlwaysLabel,
  onClose,
  onPick,
}: CategoryChangePanelProps) {
  return (
    <FormPanel
      open={open}
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
      title={title}
      description={description}
      focusOnOpenSelector='input[type="search"]'
    >
      {open ? (
        <CategoryPicker
          categories={categories}
          currentCategoryId={currentCategoryId}
          applyAlwaysLabel={applyAlwaysLabel}
          onPick={onPick}
        />
      ) : null}
    </FormPanel>
  );
}
