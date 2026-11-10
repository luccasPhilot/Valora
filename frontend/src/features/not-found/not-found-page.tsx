import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

const HOME_PATH = '/';

/** Endereço sem rota: ocupa a tela inteira, sem menu, com um único caminho de volta. */
export function Component() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
      <div className="space-y-2">
        <h1>
          <span className="type-display block text-primary">404</span>{' '}
          <span className="block font-display text-2xl font-semibold">Página não encontrada</span>
        </h1>
        <p className="text-muted-foreground">Esta página não existe</p>
      </div>
      <Button asChild>
        <Link to={HOME_PATH}>Ir para o Início</Link>
      </Button>
    </main>
  );
}
