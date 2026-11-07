import { Link } from 'react-router';

import { ValoraMark } from './valora-mark';

// Com o menu recolhido (group-data-[collapsible=icon]) só o símbolo aparece.
export function ValoraLogo() {
  return (
    <Link
      to="/"
      aria-label="Valora"
      className="flex items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
    >
      <ValoraMark className="h-7 w-auto shrink-0" />
      <span
        aria-hidden="true"
        className="font-display text-2xl font-medium tracking-tight group-data-[collapsible=icon]:hidden"
      >
        Valora
      </span>
    </Link>
  );
}
