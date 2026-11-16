import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { TOO_FAR_LABEL } from './goal-labels';
import { Component as GoalsPage } from './goals-page';

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const CAR_ID = '22222222-2222-4222-8222-222222222222';
const CONTRIBUTION_ID = '33333333-3333-4333-8333-333333333333';
const INITIAL_ID = '44444444-4444-4444-8444-444444444444';

function goal(overrides: Record<string, unknown> = {}) {
  return {
    id: TRIP_ID,
    name: 'Viagem',
    icon: 'plane',
    targetCents: 1000000,
    savedCents: 500000,
    manualSavedCents: 500000,
    isLinked: false,
    links: [],
    targetDate: null,
    progressPercent: 50,
    status: 'on_track',
    remainingCents: 500000,
    monthlyRateCents: 50000,
    requiredMonthlyCents: null,
    estimatedDate: '2027-09-15',
    isEstimateTooFar: false,
    recentContributions: [],
    ...overrides,
  };
}

const BEHIND = goal({
  status: 'behind',
  targetDate: '2027-05-15',
  requiredMonthlyCents: 50000,
  estimatedDate: null,
});
const NO_PACE = goal({ status: 'no_pace', monthlyRateCents: 0, estimatedDate: null });
const COMPLETED = goal({
  id: CAR_ID,
  name: 'Carro',
  status: 'completed',
  savedCents: 1000000,
  progressPercent: 100,
  remainingCents: 0,
  monthlyRateCents: 0,
  estimatedDate: null,
});

const CONTRIBUTIONS = [
  { id: CONTRIBUTION_ID, date: '2026-11-12', amountCents: -50000, kind: 'withdrawal' },
  { id: INITIAL_ID, date: '2026-11-10', amountCents: 150000, kind: 'initial' },
];

function baseRoutes(items: ReturnType<typeof goal>[]) {
  return {
    'GET /api/v1/goals': () => Response.json({ items }),
    [`GET /api/v1/goals/${TRIP_ID}/contributions`]: () =>
      Response.json({
        items: CONTRIBUTIONS,
        pagination: { page: 1, limit: 20, total: CONTRIBUTIONS.length },
      }),
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter initialEntries={['/metas']}>
          <HideValuesButton />
          <GoalsPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

async function findCard(name: string): Promise<HTMLElement> {
  return screen.findByRole('button', { name: new RegExp(name) });
}

function bodyOf(fetchMock: ReturnType<typeof stubRoutes>, method: string): unknown {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === method);
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

function dialogWithTitle(title: string): HTMLElement {
  const dialog = screen.getByText(title).closest('[role="dialog"]');
  if (!(dialog instanceof HTMLElement)) throw new Error(`Teste: sem diálogo "${title}"`);
  return dialog;
}

afterEach(() => {
  window.localStorage.clear();
});

describe('GoalsPage status line', () => {
  it('should_show_the_estimated_month_with_a_trend_icon_when_the_goal_is_on_track', async () => {
    // Arrange
    stubRoutes(baseRoutes([goal()]));
    // Act
    renderPage();
    // Assert
    const card = await findCard('Viagem');
    expect(card).toHaveTextContent('No ritmo — chega em set/2027');
    expect(card.querySelector('.lucide-trending-up')).not.toBeNull();
  });

  it('should_show_the_required_monthly_amount_with_an_alert_icon_when_the_goal_is_behind', async () => {
    // Arrange
    stubRoutes(baseRoutes([BEHIND]));
    // Act
    renderPage();
    // Assert
    const card = await findCard('Viagem');
    expect(card).toHaveTextContent('Atrasada — precisa guardar R$ 500/mês');
    expect(card.querySelector('.lucide-triangle-alert')).not.toBeNull();
  });

  it('should_ask_for_a_contribution_with_a_clock_icon_when_there_is_no_pace', async () => {
    // Arrange
    stubRoutes(baseRoutes([NO_PACE]));
    // Act
    renderPage();
    // Assert
    const card = await findCard('Viagem');
    expect(card).toHaveTextContent('Sem ritmo ainda — registre um aporte');
    expect(card.querySelector('.lucide-clock')).not.toBeNull();
  });

  it('should_show_completed_with_a_check_icon_when_the_goal_reached_the_target', async () => {
    // Arrange
    stubRoutes(baseRoutes([COMPLETED]));
    // Act
    renderPage();
    // Assert
    const card = await findCard('Carro');
    expect(card).toHaveTextContent('Concluída');
    expect(card.querySelector('.lucide-circle-check')).not.toBeNull();
  });

  it('should_say_it_takes_more_than_50_years_when_the_estimate_is_too_far', async () => {
    // Arrange
    const farGoal = goal({ estimatedDate: null, isEstimateTooFar: true });
    stubRoutes(baseRoutes([farGoal]));
    // Act
    renderPage();
    // Assert
    expect(await findCard('Viagem')).toHaveTextContent(TOO_FAR_LABEL);
  });

  it('should_not_depend_on_color_alone_when_showing_the_status', async () => {
    // Arrange
    stubRoutes(baseRoutes([BEHIND]));
    // Act
    renderPage();
    // Assert
    const card = await findCard('Viagem');
    const icon = card.querySelector('.lucide-triangle-alert');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(within(card).getByText(/Atrasada/)).toBeVisible();
  });

  it('should_use_a_single_color_on_the_progress_fill_whatever_the_status', async () => {
    // Arrange
    stubRoutes(baseRoutes([BEHIND]));
    // Act
    renderPage();
    // Assert
    const card = await findCard('Viagem');
    expect(card.querySelector('[data-slot="progress-indicator"]')).toHaveClass('bg-primary');
  });

  it('should_name_the_progress_bar_with_the_percent_when_rendering_a_card', async () => {
    // Arrange
    stubRoutes(baseRoutes([goal()]));
    // Act
    renderPage();
    // Assert
    const card = await findCard('Viagem');
    expect(within(card).getByRole('progressbar')).toHaveAccessibleName(
      'Viagem: 50% do valor desejado',
    );
  });
});

describe('GoalsPage list', () => {
  it('should_show_the_completed_goal_last_when_the_api_sends_it_last', async () => {
    // Arrange
    stubRoutes(baseRoutes([goal(), COMPLETED]));
    // Act
    renderPage();
    // Assert
    await findCard('Viagem');
    const names = screen
      .getAllByRole('button', { name: /Viagem|Carro/ })
      .map((card) => card.textContent);
    expect(names[names.length - 1]).toContain('Carro');
  });

  it('should_show_saved_of_target_when_rendering_a_card', async () => {
    // Arrange
    stubRoutes(baseRoutes([goal()]));
    // Act
    renderPage();
    // Assert
    expect(await findCard('Viagem')).toHaveTextContent('R$ 5.000 de R$ 10.000');
  });

  it('should_hide_the_amounts_when_hide_values_is_on', async () => {
    // Arrange
    stubRoutes(baseRoutes([goal()]));
    renderPage();
    await findCard('Viagem');
    // Act
    await userEvent.click(screen.getByRole('button', { name: /ocultar valores/i }));
    // Assert
    expect(screen.queryByText(/R\$ 5\.000/)).toBeNull();
  });
});

describe('GoalsPage states', () => {
  it('should_show_the_empty_state_with_the_create_action_when_there_are_no_goals', async () => {
    // Arrange
    stubRoutes(baseRoutes([]));
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Nenhuma meta ainda')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Criar meta' })).toBeVisible();
  });

  it('should_show_the_error_state_when_the_request_fails', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/goals': () => errorResponse(500, 'INTERNAL_ERROR') });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
  });

  it('should_show_a_loading_status_when_the_request_is_pending', () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/goals': () => new Promise<Response>(() => {}) as never });
    // Act
    renderPage();
    // Assert
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeVisible();
  });
});

describe('GoalsPage create', () => {
  it('should_ask_for_name_and_target_when_creating_with_empty_fields', async () => {
    // Arrange
    stubRoutes(baseRoutes([]));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Criar meta' }));
    const dialog = await screen.findByRole('dialog');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar meta' }));
    // Assert
    expect(await screen.findByText('Informe o nome da meta')).toBeVisible();
    expect(screen.getByText('Informe um valor desejado maior que zero')).toBeVisible();
  });

  it('should_send_the_goal_with_the_initial_value_when_creating', async () => {
    // Arrange
    const items: ReturnType<typeof goal>[] = [];
    const fetchMock = stubRoutes({
      ...baseRoutes(items),
      'GET /api/v1/goals': () => Response.json({ items }),
      'POST /api/v1/goals': () => {
        items.push(goal());
        return Response.json(goal(), { status: 201 });
      },
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Criar meta' }));
    const dialog = await screen.findByRole('dialog');
    // Act
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Viagem');
    await userEvent.type(within(dialog).getByLabelText('Valor desejado'), '1000000');
    await userEvent.type(within(dialog).getByLabelText('Já guardado (opcional)'), '150000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar meta' }));
    // Assert
    expect(await screen.findByText('Meta Viagem criada')).toBeVisible();
    expect(bodyOf(fetchMock, 'POST')).toEqual({
      name: 'Viagem',
      icon: 'piggy-bank',
      targetCents: 1000000,
      targetDate: null,
      initialCents: 150000,
      links: [],
    });
  });
});

describe('GoalsPage detail', () => {
  it('should_list_the_history_with_signed_amounts_when_opening_a_goal', async () => {
    // Arrange
    stubRoutes(baseRoutes([goal()]));
    renderPage();
    // Act
    await userEvent.click(await findCard('Viagem'));
    // Assert
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Valor inicial')).toBeVisible();
    expect(dialog).toHaveTextContent('+ R$ 1.500,00');
    expect(dialog).toHaveTextContent('− R$ 500,00');
  });

  it('should_show_the_pace_used_for_the_estimate_when_opening_a_goal', async () => {
    // Arrange
    stubRoutes(baseRoutes([goal()]));
    renderPage();
    // Act
    await userEvent.click(await findCard('Viagem'));
    // Assert
    expect(await screen.findByText('Ritmo atual')).toBeVisible();
    expect(screen.getByRole('dialog')).toHaveTextContent('R$ 500,00/mês');
  });

  it('should_send_the_deposit_when_registering_a_contribution', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([goal()]),
      [`POST /api/v1/goals/${TRIP_ID}/contributions`]: () =>
        Response.json(goal({ savedCents: 550000 }), { status: 201 }),
    });
    renderPage();
    await userEvent.click(await findCard('Viagem'));
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar aporte' }));
    // Act
    await userEvent.type(await screen.findByLabelText('Valor'), '50000');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar aporte' }));
    // Assert
    expect(await screen.findByText('Aporte registrado')).toBeVisible();
    expect(bodyOf(fetchMock, 'POST')).toMatchObject({ type: 'deposit', amountCents: 50000 });
  });

  it('should_refuse_a_withdrawal_above_the_saved_value_without_calling_the_api', async () => {
    // Arrange
    const fetchMock = stubRoutes(baseRoutes([goal({ savedCents: 20000 })]));
    renderPage();
    await userEvent.click(await findCard('Viagem'));
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar retirada' }));
    // Act
    await userEvent.type(await screen.findByLabelText('Valor'), '30000');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar retirada' }));
    // Assert
    expect(await screen.findByText('A retirada passa do valor acumulado da meta')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('should_not_allow_a_withdrawal_when_nothing_was_saved', async () => {
    // Arrange
    stubRoutes(baseRoutes([goal({ savedCents: 0 })]));
    renderPage();
    // Act
    await userEvent.click(await findCard('Viagem'));
    // Assert
    expect(await screen.findByRole('button', { name: 'Registrar retirada' })).toBeDisabled();
  });

  it('should_ask_for_confirmation_before_removing_a_contribution', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([goal()]),
      [`DELETE /api/v1/goals/${TRIP_ID}/contributions/${CONTRIBUTION_ID}`]: () =>
        Response.json(goal()),
    });
    renderPage();
    await userEvent.click(await findCard('Viagem'));
    // Act
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remover retirada de 12/11/2026' }),
    );
    // Assert
    expect(await screen.findByText('Remover este registro?')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });

  it('should_remove_the_contribution_when_confirming', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([goal()]),
      [`DELETE /api/v1/goals/${TRIP_ID}/contributions/${CONTRIBUTION_ID}`]: () =>
        Response.json(goal()),
    });
    renderPage();
    await userEvent.click(await findCard('Viagem'));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remover retirada de 12/11/2026' }),
    );
    // Act
    await userEvent.click(
      within(dialogWithTitle('Remover este registro?')).getByRole('button', { name: 'Remover' }),
    );
    // Assert
    expect(await screen.findByText('Registro removido')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
  });

  it('should_explain_why_it_cannot_remove_when_the_api_answers_conflict', async () => {
    // Arrange
    stubRoutes({
      ...baseRoutes([goal()]),
      [`DELETE /api/v1/goals/${TRIP_ID}/contributions/${CONTRIBUTION_ID}`]: () =>
        errorResponse(409, 'CONFLICT'),
    });
    renderPage();
    await userEvent.click(await findCard('Viagem'));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remover retirada de 12/11/2026' }),
    );
    // Act
    await userEvent.click(
      within(dialogWithTitle('Remover este registro?')).getByRole('button', { name: 'Remover' }),
    );
    // Assert
    expect(await screen.findByText(/há retiradas depois deste aporte/)).toBeVisible();
  });
});

describe('GoalsPage edit and delete', () => {
  it('should_send_the_changes_when_editing_a_goal', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([goal()]),
      [`PUT /api/v1/goals/${TRIP_ID}`]: () => Response.json(goal({ name: 'Europa' })),
    });
    renderPage();
    await userEvent.click(await findCard('Viagem'));
    await userEvent.click(await screen.findByRole('button', { name: 'Editar meta' }));
    const nameField = await screen.findByLabelText('Nome');
    // Act
    await userEvent.clear(nameField);
    await userEvent.type(nameField, 'Europa');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar meta' }));
    // Assert
    expect(await screen.findByText('Meta Europa salva')).toBeVisible();
    expect(bodyOf(fetchMock, 'PUT')).toMatchObject({ name: 'Europa', targetCents: 1000000 });
  });

  it('should_ask_for_confirmation_before_deleting_a_goal', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([goal()]),
      [`DELETE /api/v1/goals/${TRIP_ID}`]: () => new Response(null, { status: 204 }),
    });
    renderPage();
    await userEvent.click(await findCard('Viagem'));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir meta' }));
    // Assert
    expect(await screen.findByText('Excluir meta?')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });

  it('should_delete_the_goal_when_confirming', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      ...baseRoutes([goal()]),
      [`DELETE /api/v1/goals/${TRIP_ID}`]: () => new Response(null, { status: 204 }),
    });
    renderPage();
    await userEvent.click(await findCard('Viagem'));
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir meta' }));
    // Act
    await userEvent.click(
      within(dialogWithTitle('Excluir meta?')).getByRole('button', { name: 'Excluir' }),
    );
    // Assert
    expect(await screen.findByText('Meta Viagem excluída')).toBeVisible();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => init?.method === 'DELETE' && String(url).endsWith(`/goals/${TRIP_ID}`),
        ),
      ).toBe(true),
    );
  });
});
