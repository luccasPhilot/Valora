import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { ReportDefinition } from './report-definitions';
import { ReportsNav } from './reports-nav';

const REPORTS: readonly ReportDefinition[] = [
  { key: 'income-expense', label: 'Receitas e despesas', path: 'receitas-e-despesas' },
  { key: 'categories', label: 'Categorias', path: 'categorias' },
];

function renderNav(filtersSearch: string, reports = REPORTS) {
  render(
    <MemoryRouter initialEntries={['/relatorios/receitas-e-despesas']}>
      <ReportsNav reports={reports} filtersSearch={filtersSearch} />
    </MemoryRouter>,
  );
}

describe('ReportsNav', () => {
  it('should_list_the_reports_and_mark_the_open_one_when_there_are_two_or_more', () => {
    // Arrange
    // Act
    renderNav('');
    // Assert
    expect(screen.getByRole('link', { name: 'Receitas e despesas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Categorias' })).not.toHaveAttribute('aria-current');
  });

  it('should_keep_the_period_in_the_links_when_the_url_has_one', () => {
    // Arrange
    // Act
    renderNav('?periodo=24m');
    // Assert
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute(
      'href',
      '/relatorios/categorias?periodo=24m',
    );
  });

  it('should_keep_the_view_in_the_links_when_the_url_has_one', () => {
    // Arrange
    // Act
    renderNav('?periodo=6m&visao=tabela');
    // Assert
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute(
      'href',
      '/relatorios/categorias?periodo=6m&visao=tabela',
    );
  });

  it('should_render_nothing_when_there_is_only_one_report', () => {
    // Arrange
    // Act
    renderNav('', REPORTS.slice(0, 1));
    // Assert
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
