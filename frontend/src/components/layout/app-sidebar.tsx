import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import { ValoraLogo } from '@/components/brand/valora-logo';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  type AppArea,
  getAreaCurrent,
  isAreaActive,
  listAreasByGroup,
  MENU_GROUPS,
} from '@/lib/areas';

// Item de 44 px; recolhido vira um quadrado de 44 px só com o ícone (o texto sai da tela, mas continua sendo o nome do link). Com 12 px de lado nos dois estados, o ícone não se mexe quando o menu abre ou fecha. O ativo é o único com fundo e leva uma barra à esquerda, para o estado não depender só da cor do fundo (1,1:1 contra o menu); o hover é neutro, para não parecer ativo.
const MENU_ITEM_CLASSES =
  'relative h-11 gap-3 rounded-sm px-3 font-display text-base font-medium [&>svg]:size-5 group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:[&>span]:sr-only group-data-[collapsible=icon]:[&>span]:opacity-0 group-data-[collapsible=icon]:[&>span]:transition-none [&>span]:transition-opacity [&>span]:delay-75 [&>span]:duration-150 [&>span]:ease-out motion-reduce:[&>span]:transition-none duration-200 ease-out motion-reduce:transition-none hover:bg-muted hover:text-sidebar-foreground active:bg-muted active:text-sidebar-foreground data-[active=true]:bg-secondary data-[active=true]:font-bold data-[active=true]:text-secondary-foreground data-[active=true]:[&>svg]:text-primary data-[active=true]:before:absolute data-[active=true]:before:top-1/2 data-[active=true]:before:left-1 data-[active=true]:before:h-5 data-[active=true]:before:w-[3px] data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary';
const SIDE_PADDING_CLASSES = 'px-4 group-data-[collapsible=icon]:px-3.5';
// Recolhido, ou em tela baixa (`short`, menu inteiro não cabe), o nome do grupo some e uma linha de lado a lado separa os grupos, como a do rodapé.
const COMPACT_DIVIDER_CLASSES =
  'group-data-[collapsible=icon]:border-t group-data-[collapsible=icon]:border-sidebar-border group-data-[collapsible=icon]:pt-2 short:border-t short:border-sidebar-border short:pt-2';
const COMPACT_GROUP_LABEL_CLASSES = 'short:-mt-8 short:opacity-0';
// Quando ainda falta altura, só a lista rola: barra fina, na cor do tema, em vez da barra branca do navegador.
const SCROLL_AREA_CLASSES =
  'overscroll-contain [scrollbar-color:color-mix(in_srgb,var(--muted-foreground)_45%,transparent)_transparent] [scrollbar-width:thin]';
// Os espaços que mudam com o menu (lados, topo do grupo, vão entre grupos) andam junto com a largura, para os ícones deslizarem em vez de pular.
const LAYOUT_TRANSITION_CLASSES = 'duration-200 ease-out motion-reduce:transition-none';

// Só entram grupos que já têm área pronta (Design System).
const VISIBLE_MENU_GROUPS = MENU_GROUPS.map((group) => ({
  ...group,
  areas: listAreasByGroup(group.id),
})).filter((group) => group.areas.length > 0);

interface AreaMenuProps {
  areas: AppArea[];
  /** Id do nome visível do grupo, que dá nome à lista para o leitor de tela. */
  labelledBy?: string;
}

function AreaMenu({ areas, labelledBy }: AreaMenuProps) {
  const { isMobile, openMobile } = useSidebar();
  const { pathname } = useLocation();
  // Com o menu aberto no celular, escolher uma área troca a entrada do menu no histórico em vez de empilhar outra.
  const shouldReplaceMenuEntry = isMobile && openMobile;

  return (
    <SidebarMenu aria-labelledby={labelledBy}>
      {areas.map((area) => (
        <SidebarMenuItem key={area.path}>
          <SidebarMenuButton
            asChild
            tooltip={area.title}
            isActive={isAreaActive(area, pathname)}
            className={MENU_ITEM_CLASSES}
          >
            <Link
              to={area.path}
              replace={shouldReplaceMenuEntry}
              aria-current={getAreaCurrent(area, pathname)}
            >
              <area.icon aria-hidden="true" />
              <span>{area.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

// Só a partir de 1024 px: abaixo disso o menu abre por cima e fecha pelo "x".
function CollapseButton() {
  const { open, setOpen } = useSidebar();
  const Icon = open ? ChevronsLeft : ChevronsRight;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="hidden text-muted-foreground lg:inline-flex"
      aria-label={open ? 'Recolher menu' : 'Expandir menu'}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  );
}

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className={`h-18 flex-row items-center justify-between gap-2 py-0 transition-[height] duration-200 ease-out motion-reduce:transition-none group-data-[collapsible=icon]:h-28 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:py-4 ${SIDE_PADDING_CLASSES}`}
      >
        <ValoraLogo />
        <CollapseButton />
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpenMobile(false)}
        >
          <X className="size-5" aria-hidden="true" />
        </Button>
      </SidebarHeader>
      <SidebarContent className={`pt-2 ${SCROLL_AREA_CLASSES}`}>
        <nav
          aria-label="Principal"
          className={`flex flex-col gap-5 transition-[gap] group-data-[collapsible=icon]:gap-2 short:gap-2 ${LAYOUT_TRANSITION_CLASSES}`}
        >
          {VISIBLE_MENU_GROUPS.map((group, index) => (
            <SidebarGroup
              key={group.id}
              className={`py-0 transition-[padding] ${LAYOUT_TRANSITION_CLASSES} ${SIDE_PADDING_CLASSES} ${index > 0 ? COMPACT_DIVIDER_CLASSES : ''}`}
            >
              <SidebarGroupLabel
                id={`menu-group-${group.id}`}
                className={`mb-2 px-3 ${COMPACT_GROUP_LABEL_CLASSES}`}
              >
                {group.title}
              </SidebarGroupLabel>
              <AreaMenu areas={group.areas} labelledBy={`menu-group-${group.id}`} />
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter
        className={`mt-6 short:mt-2 gap-0 border-t border-sidebar-border pt-4 short:pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] ${SIDE_PADDING_CLASSES}`}
      >
        <nav aria-label="Configurações">
          <AreaMenu areas={listAreasByGroup('footer')} />
        </nav>
      </SidebarFooter>
    </Sidebar>
  );
}
