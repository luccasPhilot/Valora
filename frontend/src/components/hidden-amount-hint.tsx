import { HIDDEN_AMOUNT_HINT } from '@/lib/hidden-amount';

/** O aviso sob o campo de valor que abriu vazio por causa de "Ocultar valores". */
export function HiddenAmountHint({ id }: { id: string }) {
  return (
    <p id={id} className="text-sm text-muted-foreground">
      {HIDDEN_AMOUNT_HINT}
    </p>
  );
}
