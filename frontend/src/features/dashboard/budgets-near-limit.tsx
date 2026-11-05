import { Plus, Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import type { Budget } from '@/lib/api/budgets';

import { BudgetRow } from '../budgets/budget-row';
import { DashboardSection, SectionEmpty, SectionLink } from './dashboard-section';

const BUDGETS_PATH = '/orcamentos';

/** Os orçamentos mais perto do limite (a API manda os 3 primeiros), com o status em ícone e texto. */
export function BudgetsNearLimit({ budgets }: { budgets: readonly Budget[] }) {
  const navigate = useNavigate();
  return (
    <DashboardSection
      title="Orçamentos"
      icon={Target}
      action={
        budgets.length > 0 ? <SectionLink to={BUDGETS_PATH}>Ver todos</SectionLink> : undefined
      }
    >
      {budgets.length === 0 ? (
        <SectionEmpty
          message="Nenhum orçamento neste mês"
          action={
            <Button asChild variant="outline">
              <Link to={BUDGETS_PATH}>
                <Plus aria-hidden="true" />
                Criar orçamento
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {budgets.map((budget) => (
            <BudgetRow
              key={budget.categoryId}
              budget={budget}
              onSelect={() => void navigate(BUDGETS_PATH)}
            />
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
