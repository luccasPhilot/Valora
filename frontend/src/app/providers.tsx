import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { HideValuesProvider } from '@/components/hide-values-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

import { createQueryClient } from './query-client';

interface AppProvidersProps {
  children: ReactNode;
  /** Os testes passam um cliente sem repetição; o app cria o dele. */
  queryClient?: QueryClient;
}

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <HideValuesProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </HideValuesProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
