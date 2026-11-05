export type CategoryKind = 'expense' | 'income' | 'transfer';

export interface DefaultCategory {
  /** Chave estável: o seed procura por ela, não pelo nome, que você pode mudar. */
  readonly seedKey: string;
  readonly name: string;
  readonly kind: CategoryKind;
  /** Nome do ícone Lucide, em kebab-case. */
  readonly icon: string;
}

export const DEFAULT_CATEGORIES = [
  { seedKey: 'housing', name: 'Moradia', kind: 'expense', icon: 'house' },
  { seedKey: 'groceries', name: 'Mercado', kind: 'expense', icon: 'shopping-cart' },
  { seedKey: 'food', name: 'Alimentação', kind: 'expense', icon: 'utensils' },
  { seedKey: 'transport', name: 'Transporte', kind: 'expense', icon: 'car' },
  { seedKey: 'health', name: 'Saúde', kind: 'expense', icon: 'heart-pulse' },
  { seedKey: 'education', name: 'Educação', kind: 'expense', icon: 'graduation-cap' },
  { seedKey: 'leisure', name: 'Lazer', kind: 'expense', icon: 'ticket' },
  { seedKey: 'shopping', name: 'Compras', kind: 'expense', icon: 'shopping-bag' },
  { seedKey: 'subscriptions', name: 'Assinaturas', kind: 'expense', icon: 'repeat' },
  { seedKey: 'services', name: 'Serviços', kind: 'expense', icon: 'wrench' },
  { seedKey: 'taxes_and_fees', name: 'Impostos e taxas', kind: 'expense', icon: 'receipt' },
  { seedKey: 'cash_withdrawal', name: 'Saque', kind: 'expense', icon: 'banknote' },
  { seedKey: 'other_expenses', name: 'Outras despesas', kind: 'expense', icon: 'ellipsis' },
  { seedKey: 'salary', name: 'Salário', kind: 'income', icon: 'wallet' },
  { seedKey: 'investment_income', name: 'Rendimentos', kind: 'income', icon: 'trending-up' },
  { seedKey: 'refunds', name: 'Reembolsos', kind: 'income', icon: 'undo-2' },
  { seedKey: 'other_income', name: 'Outras receitas', kind: 'income', icon: 'circle-plus' },
  {
    seedKey: 'credit_card_payment',
    name: 'Pagamento de fatura',
    kind: 'transfer',
    icon: 'credit-card',
  },
  {
    seedKey: 'account_transfer',
    name: 'Transferência entre contas',
    kind: 'transfer',
    icon: 'arrow-left-right',
  },
  { seedKey: 'investment_flow', name: 'Aplicação e resgate', kind: 'transfer', icon: 'piggy-bank' },
] as const satisfies readonly DefaultCategory[];

export type DefaultCategoryKey = (typeof DEFAULT_CATEGORIES)[number]['seedKey'];
