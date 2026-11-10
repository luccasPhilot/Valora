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
import { type AppArea, isAreaActive, listAreasByGroup } from '@/lib/areas';

// Item de 44 px; recolhido vira um quadrado de 44 px só com o ícone. O ativo é o único com fundo.
const MENU_ITEM_CLASSES =
  'h-11 gap-3 rounded-sm px-3 font-display text-base font-medium [&>svg]:size-5 group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden data-[active=true]:bg-secondary data-[active=true]:font-bold data-[active=true]:text-secondary-foreground data-[active=true]:[&>svg]:text-primary';
const SIDE_PADDING_CLASSES = 'px-4 group-data-[collapsible=icon]:px-3.5';

interface AreaMenuProps {
  areas: AppArea[];
}

function AreaMenu({ areas }: AreaMenuProps) {
  const { setOpenMobile } = useSidebar();
  const { pathname } = useLocation();

  return (
    <SidebarMenu>
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
              aria-current={pathname === area.path ? 'page' : undefined}
              onClick={() => setOpenMobile(false)}
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
        className={`h-[72px] flex-row items-center justify-between gap-2 py-0 group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:py-4 ${SIDE_PADDING_CLASSES}`}
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
      <SidebarContent className="pt-2">
        <SidebarGroup className={`py-0 ${SIDE_PADDING_CLASSES}`}>
          <SidebarGroupLabel className="mb-2 px-3">Dia a dia</SidebarGroupLabel>
          <AreaMenu areas={listAreasByGroup('daily')} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter
        className={`mt-6 gap-0 border-t border-sidebar-border pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${SIDE_PADDING_CLASSES}`}
      >
        <AreaMenu areas={listAreasByGroup('footer')} />
      </SidebarFooter>
    </Sidebar>
  );
}
