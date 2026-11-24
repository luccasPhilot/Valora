// O nome que o leitor de tela lê para cada ícone do seletor: o que o desenho mostra, em pt-BR.
// Ícone novo em `category-icons.tsx` precisa de nome aqui (o teste falha se faltar).
const ICON_LABELS: Readonly<Record<string, string>> = {
  house: 'Casa',
  'shopping-cart': 'Carrinho de compras',
  utensils: 'Talheres',
  car: 'Carro',
  'heart-pulse': 'Coração com batimento',
  'graduation-cap': 'Capelo de formatura',
  ticket: 'Ingresso',
  'shopping-bag': 'Sacola de compras',
  repeat: 'Setas em ciclo',
  wrench: 'Chave inglesa',
  receipt: 'Recibo',
  banknote: 'Cédula',
  ellipsis: 'Três pontos',
  wallet: 'Carteira',
  'trending-up': 'Gráfico subindo',
  'undo-2': 'Seta de voltar',
  'circle-plus': 'Círculo com sinal de mais',
  'credit-card': 'Cartão de crédito',
  'arrow-left-right': 'Setas de transferência',
  'piggy-bank': 'Cofrinho',
  'paw-print': 'Pegada de animal',
  coffee: 'Xícara de café',
  fuel: 'Bomba de combustível',
  bus: 'Ônibus',
  train: 'Trem',
  bike: 'Bicicleta',
  plane: 'Avião',
  gift: 'Presente',
  'gamepad-2': 'Controle de videogame',
  music: 'Nota musical',
  film: 'Filme',
  book: 'Livro',
  dumbbell: 'Haltere',
  pill: 'Comprimido',
  stethoscope: 'Estetoscópio',
  baby: 'Bebê',
  shirt: 'Camiseta',
  smartphone: 'Celular',
  wifi: 'Wi-Fi',
  zap: 'Raio',
  droplet: 'Gota',
  flame: 'Chama',
  briefcase: 'Maleta',
  landmark: 'Prédio de banco',
  percent: 'Porcentagem',
  'hand-coins': 'Mão com moedas',
  coins: 'Moedas',
  sparkles: 'Brilhos',
  scissors: 'Tesoura',
  hammer: 'Martelo',
  sofa: 'Sofá',
  tv: 'Televisão',
  laptop: 'Notebook',
  heart: 'Coração',
  globe: 'Globo',
  umbrella: 'Guarda-chuva',
  beer: 'Caneca de cerveja',
  pizza: 'Pizza',
  apple: 'Maçã',
  cake: 'Bolo',
  dog: 'Cachorro',
  wine: 'Taça de vinho',
  tag: 'Etiqueta',
};

const UNNAMED_ICON_LABEL = 'Ícone';

/** O nome em pt-BR do ícone; um ícone sem nome cadastrado é lido só como "Ícone". */
export function iconLabel(iconName: string): string {
  return ICON_LABELS[iconName] ?? UNNAMED_ICON_LABEL;
}

export function hasIconLabel(iconName: string): boolean {
  return iconName in ICON_LABELS;
}
