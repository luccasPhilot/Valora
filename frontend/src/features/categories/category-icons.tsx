import {
  Apple,
  ArrowLeftRight,
  Baby,
  Banknote,
  Beer,
  Bike,
  Book,
  Briefcase,
  Bus,
  Cake,
  Car,
  CirclePlus,
  Coffee,
  Coins,
  CreditCard,
  Dog,
  Droplet,
  Dumbbell,
  Ellipsis,
  Film,
  Flame,
  Fuel,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  HandCoins,
  Heart,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  type LucideIcon,
  Music,
  PawPrint,
  Percent,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Repeat,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Stethoscope,
  Tag,
  Ticket,
  Train,
  TrendingUp,
  Tv,
  Umbrella,
  Undo2,
  Utensils,
  Wallet,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from 'lucide-react';

const FALLBACK_ICON = Tag;

// Ícones Lucide que a tela sabe desenhar (as categorias padrão e uma lista de sugestões).
// A API guarda só o nome em kebab-case; um nome fora desta lista aparece como etiqueta genérica.
const CATEGORY_ICONS: Readonly<Record<string, LucideIcon>> = {
  house: House,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  ticket: Ticket,
  'shopping-bag': ShoppingBag,
  repeat: Repeat,
  wrench: Wrench,
  receipt: Receipt,
  banknote: Banknote,
  ellipsis: Ellipsis,
  wallet: Wallet,
  'trending-up': TrendingUp,
  'undo-2': Undo2,
  'circle-plus': CirclePlus,
  'credit-card': CreditCard,
  'arrow-left-right': ArrowLeftRight,
  'piggy-bank': PiggyBank,
  'paw-print': PawPrint,
  coffee: Coffee,
  fuel: Fuel,
  bus: Bus,
  train: Train,
  bike: Bike,
  plane: Plane,
  gift: Gift,
  'gamepad-2': Gamepad2,
  music: Music,
  film: Film,
  book: Book,
  dumbbell: Dumbbell,
  pill: Pill,
  stethoscope: Stethoscope,
  baby: Baby,
  shirt: Shirt,
  smartphone: Smartphone,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
  flame: Flame,
  briefcase: Briefcase,
  landmark: Landmark,
  percent: Percent,
  'hand-coins': HandCoins,
  coins: Coins,
  sparkles: Sparkles,
  scissors: Scissors,
  hammer: Hammer,
  sofa: Sofa,
  tv: Tv,
  laptop: Laptop,
  heart: Heart,
  globe: Globe,
  umbrella: Umbrella,
  beer: Beer,
  pizza: Pizza,
  apple: Apple,
  cake: Cake,
  dog: Dog,
  wine: Wine,
  tag: Tag,
};

export const SUGGESTED_ICON_NAMES: readonly string[] = Object.keys(CATEGORY_ICONS);

interface CategoryIconProps {
  name: string;
  className?: string;
}

/** Ícone sozinho, para grades e botões. */
export function CategoryGlyph({ name, className }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[name] ?? FALLBACK_ICON;
  return <Icon className={className ?? 'size-5'} aria-hidden="true" />;
}

/** Bolinha `secondary` com o ícone da categoria (Design System, "Gastos por categoria"). */
export function CategoryBadgeIcon({ name }: CategoryIconProps) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
      <CategoryGlyph name={name} />
    </span>
  );
}
