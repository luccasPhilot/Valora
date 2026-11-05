import { DEFAULT_CATEGORIES, type DefaultCategoryKey } from './default-categories.js';

// Mapeamento inicial: nome da categoria do Pluggy (o `pluggy_category` da transação) → chave da
// categoria padrão do Valora. Montado a partir da lista real do Pluggy (`npm run fixtures:categories`).
//
// Ficam de fora, de propósito, as categorias que misturam entrada e saída (transferências para
// terceiros, Pix, TED, DOC, boleto, empréstimos, "Other"...): escolher uma categoria para elas aqui
// erraria o tipo de metade das transações. Sem mapeamento a transação fica sem categoria, e você
// decide na aba "Pluggy" ou com uma regra.
const MAPPINGS_BY_CATEGORY: Readonly<Record<DefaultCategoryKey, readonly string[]>> = {
  housing: ['Housing', 'Rent', 'Utilities', 'Water', 'Electricity', 'Gas', 'Houseware'],
  groceries: ['Groceries'],
  food: ['Food and drinks', 'Eating out', 'Food delivery'],
  transport: [
    'Transportation',
    'Taxi and ride-hailing',
    'Public transportation',
    'Car rental',
    'Bicycle',
    'Automotive',
    'Gas stations',
    'Parking',
    'Tolls and in vehicle payment',
    'Vehicle ownership taxes and fees',
    'Vehicle maintenance',
    'Traffic tickets',
  ],
  health: [
    'Healthcare',
    'Dentist',
    'Pharmacy',
    'Optometry',
    'Hospital clinics and labs',
    'Health insurance',
    'Wellness and fitness',
    'Gyms and fitness centers',
    'Sports practice',
    'Wellness',
  ],
  education: ['Education', 'Online Courses', 'University', 'School', 'Kindergarten'],
  leisure: [
    'Leisure',
    'Tickets',
    'Stadiums and arenas',
    'Landmarks and museums',
    'Cinema, theater and concerts',
    'Travel',
    'Airport and airlines',
    'Accomodation',
    'Mileage programs',
    'Bus tickets',
    'Gaming',
    'Gambling',
    'Lottery',
    'Online bet',
  ],
  shopping: [
    'Shopping',
    'Online shopping',
    'Electronics',
    'Pet supplies and vet',
    'Clothing',
    'Kids and toys',
    'Bookstore',
    'Sports goods',
    'Office supplies',
  ],
  subscriptions: ['Digital services', 'Video streaming', 'Music streaming'],
  services: [
    'Services',
    'Telecommunications',
    'Internet',
    'Mobile',
    'TV',
    'Insurance',
    'Life insurance',
    'Home insurance',
    'Vehicle insurance',
  ],
  taxes_and_fees: [
    'Taxes',
    'Income taxes',
    'Taxes on investments',
    'Tax on financial operations',
    'Urban land and building tax',
    'Bank fees',
    'Account fees',
    'Wire transfer fees and ATM fees',
    'Credit card fees',
    'Late payment and overdraft costs',
    'Interests charged',
  ],
  cash_withdrawal: [],
  other_expenses: [
    'Donations',
    'Legal obligations',
    'Alimony',
    'Financing',
    'Real estate financing',
    'Vehicle financing',
    'Student loan',
  ],
  salary: ['Salary', 'Retirement'],
  investment_income: ['Proceeds interests and dividends'],
  refunds: ['Cashback'],
  other_income: ['Income', 'Entrepreneurial activities', 'Government aid', 'Non-recurring income'],
  credit_card_payment: ['Credit card payment'],
  account_transfer: [
    'Transfer - Internal',
    'Same person transfer',
    'Same person transfer - CASH',
    'Same person transfer - PIX',
    'Same person transfer - TED',
  ],
  investment_flow: [
    'Investments',
    'Automatic investment',
    'Fixed income',
    'Mutual funds',
    'Variable income',
    'Margin',
    'Pension',
  ],
};

export interface InitialPluggyMapping {
  readonly pluggyCategory: string;
  readonly categorySeedKey: DefaultCategoryKey;
}

export const INITIAL_PLUGGY_MAPPINGS: readonly InitialPluggyMapping[] = DEFAULT_CATEGORIES.flatMap(
  ({ seedKey }) =>
    MAPPINGS_BY_CATEGORY[seedKey].map((pluggyCategory) => ({
      pluggyCategory,
      categorySeedKey: seedKey,
    })),
);
