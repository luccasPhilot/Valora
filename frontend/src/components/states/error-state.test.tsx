import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './error-state';

function FailingScreen({ fetchData }: { fetchData: () => Promise<string> }) {
  const query = useQuery({ queryKey: ['demo'], queryFn: fetchData });
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  return <p>{query.data ?? 'carregando'}</p>;
}

function renderFailingScreen(fetchData: () => Promise<string>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FailingScreen fetchData={fetchData} />
    </QueryClientProvider>,
  );
}

describe('ErrorState', () => {
  it('should_refetch_the_query_when_retry_button_is_pressed', async () => {
    // Arrange
    const fetchData = vi.fn().mockRejectedValueOnce(new Error('falhou')).mockResolvedValue('ok');
    renderFailingScreen(fetchData);
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    // Assert
    expect(await screen.findByText('ok')).toBeVisible();
  });

  it('should_not_show_technical_details_when_query_fails', async () => {
    // Arrange
    renderFailingScreen(() => Promise.reject(new Error('ECONNREFUSED 10.0.0.1:5432')));
    // Act
    const alert = await screen.findByRole('alert');
    // Assert
    expect(alert).not.toHaveTextContent('ECONNREFUSED');
  });
});
