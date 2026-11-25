/** Aba de navegação entre telas irmãs (relatórios, visões de Transações): a atual leva a linha `primary`. */
export const PAGE_TAB_CLASSES = [
  'inline-flex h-11 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground outline-none',
  'hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
  'aria-[current=page]:border-primary aria-[current=page]:text-foreground',
].join(' ');
