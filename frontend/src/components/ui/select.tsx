import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';

import { Popover, PopoverAnchor, PopoverContent } from './popover';
import { type RenderOptionIcon, SelectList } from './select-list';
import { readSelectGroups, type SelectListGroup } from './select-options';

// Mouse (ou touchpad): lista própria, com o visual do Design System. Toque: seletor do sistema.
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const OPEN_KEYS = new Set([' ', 'Enter', 'ArrowDown', 'ArrowUp']);

interface SelectProps extends React.ComponentProps<'select'> {
  /** Desenha o ícone de cada opção que tem `data-icon`; sem ele, a lista mostra só o texto. */
  renderOptionIcon?: RenderOptionIcon;
}

/** Faz o `onChange` do `<select>` disparar como se a pessoa tivesse escolhido a opção. */
function commitValue(select: HTMLSelectElement, value: string): void {
  if (select.value === value) return;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Select nativo, que no celular abre o seletor do sistema (o mais fácil de usar com uma mão).
 * Com mouse, o `<select>` continua sendo o campo (rótulo, foco, formulário e `onChange` iguais), mas
 * a lista aberta é a do Valora: a do navegador não segue tema, raio nem tipografia do app.
 */
function Select({ className, children, renderOptionIcon, ...props }: SelectProps) {
  const isFinePointer = useMediaQuery(FINE_POINTER_QUERY);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [openGroups, setOpenGroups] = React.useState<SelectListGroup[] | null>(null);

  const openList = (select: HTMLSelectElement) => setOpenGroups(readSelectGroups(select));
  const closeList = () => setOpenGroups(null);
  const getSelect = () => wrapperRef.current?.querySelector('select') ?? null;

  const handleMouseDown = (event: React.MouseEvent<HTMLSelectElement>) => {
    if (!isFinePointer || props.disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    if (openGroups === null) openList(event.currentTarget);
    else closeList();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLSelectElement>) => {
    if (!isFinePointer || props.disabled || !OPEN_KEYS.has(event.key)) return;
    event.preventDefault();
    openList(event.currentTarget);
  };

  const handlePick = (value: string) => {
    const select = getSelect();
    if (select) commitValue(select, value);
    closeList();
  };

  return (
    <Popover open={openGroups !== null} onOpenChange={(isOpen) => !isOpen && closeList()}>
      <PopoverAnchor asChild>
        <div ref={wrapperRef} className="relative">
          <select
            data-slot="select"
            className={cn(
              'h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent py-1 pr-10 pl-3 text-base shadow-xs outline-none disabled:pointer-events-none disabled:opacity-50 lg:text-sm dark:bg-input/30',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'aria-invalid:border-destructive',
              className,
            )}
            {...props}
            onMouseDown={handleMouseDown}
            onKeyDown={handleKeyDown}
          >
            {children}
          </select>
          <ChevronDown
            className={cn(
              'pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-150 ease-out motion-reduce:transition-none',
              openGroups !== null && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </div>
      </PopoverAnchor>
      {openGroups === null ? null : (
        <PopoverContent
          align="start"
          sideOffset={6}
          collisionPadding={12}
          // Clicar no próprio campo com a lista aberta fecha pelo `handleMouseDown`, não por aqui.
          onInteractOutside={(event) => {
            if (event.target instanceof Node && wrapperRef.current?.contains(event.target)) {
              event.preventDefault();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            getSelect()?.focus();
          }}
          className="w-(--radix-popover-trigger-width) min-w-56 overflow-hidden rounded-md p-0 shadow-overlay"
        >
          <SelectList
            groups={openGroups}
            selectedValue={getSelect()?.value ?? ''}
            renderOptionIcon={renderOptionIcon}
            onPick={handlePick}
          />
        </PopoverContent>
      )}
    </Popover>
  );
}

export { Select };
