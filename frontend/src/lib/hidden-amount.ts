import { centsToDigits } from './money-digits';

// Com "Ocultar valores" ligado, o campo de valor de um formulário de edição abre vazio, para não
// mostrar o valor, e em branco quer dizer "manter o valor salvo".

export const HIDDEN_AMOUNT_HINT = 'Valores ocultos. Deixe em branco para manter o valor atual.';

export interface EditAmountField {
  /** Os dígitos com que o campo abre. */
  readonly initialDigits: string;
  /** Os dígitos do valor salvo, quando o campo abriu vazio por causa dos valores ocultos; senão nulo. */
  readonly keptDigits: string | null;
}

/** Campo de valor de um formulário de criação: vazio e obrigatório. */
export const NEW_AMOUNT_FIELD: EditAmountField = { initialDigits: '', keptDigits: null };

interface EditAmountRequest {
  /** O valor salvo; o sinal não importa, o campo só tem dígitos. */
  readonly cents: number;
  readonly areValuesHidden: boolean;
}

export function editAmountField({ cents, areValuesHidden }: EditAmountRequest): EditAmountField {
  const storedDigits = centsToDigits(Math.abs(cents));
  if (areValuesHidden) return { initialDigits: '', keptDigits: storedDigits };
  return { initialDigits: storedDigits, keptDigits: null };
}

/** Os dígitos a salvar: o campo deixado em branco, aberto com os valores ocultos, mantém o valor salvo. */
export function resolveAmountDigits(digits: string, keptDigits: string | null): string {
  if (digits !== '' || keptDigits === null) return digits;
  return keptDigits;
}
