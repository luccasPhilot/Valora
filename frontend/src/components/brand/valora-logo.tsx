import { Link } from 'react-router';

import { ValoraMark } from './valora-mark';

// Com o menu recolhido (group-data-[collapsible=icon]) só o símbolo aparece; o nome some na hora e volta com atraso, quando o menu já abriu.
export function ValoraLogo() {
  return (
    <Link
      to="/"
      aria-label="Valora"
      className="flex min-h-11 min-w-11 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
    >
      <ValoraMark className="h-7 w-auto shrink-0" />
      <span
        aria-hidden="true"
        className="font-display text-2xl font-medium tracking-tight transition-opacity delay-75 duration-150 ease-out group-data-[collapsible=icon]:sr-only group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:transition-none motion-reduce:transition-none"
      >
        Valora
      </span>
    </Link>
  );
}
