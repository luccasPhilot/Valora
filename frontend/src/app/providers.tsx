import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { HideValuesProvider } from '@/components/hide-values-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

import { createQueryClient } from './query-client';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HideValuesProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </HideValuesProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
