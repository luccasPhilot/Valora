import { X } from 'lucide-react';
import { Link, useLocation } from 'react-router';

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
import { type AppArea, listAreasByGroup } from '@/lib/areas';

const ACTIVE_ITEM_CLASSES =
  'min-h-11 data-[active=true]:bg-secondary data-[active=true]:font-bold data-[active=true]:text-secondary-foreground';

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
            isActive={pathname === area.path}
            className={ACTIVE_ITEM_CLASSES}
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

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center justify-between px-4 py-3">
        <span className="font-display text-xl font-bold">Valora</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpenMobile(false)}
        >
          <X className="size-5" aria-hidden="true" />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dia a dia</SidebarGroupLabel>
          <AreaMenu areas={listAreasByGroup('daily')} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <AreaMenu areas={listAreasByGroup('footer')} />
      </SidebarFooter>
    </Sidebar>
  );
}
