import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { Category, CategoryRule, CategoryRuleInput, MatchType } from '@/lib/api/categories';

import { MATCH_TYPE_LABELS, MATCH_TYPE_ORDER, parseMatchType } from './category-labels';
import { CategorySelect } from './category-select';

const MAX_PATTERN_LENGTH = 120;
const MIN_PRIORITY = 0;
const MAX_PRIORITY = 1000;

interface RuleFormProps {
  rule: CategoryRule | null;
  categories: readonly Category[];
  isPending: boolean;
  errorMessage: string | null;
  onSubmit: (input: CategoryRuleInput) => void;
  onCancel: () => void;
}

function parsePriority(text: string): number | null {
  const priority = Number(text);
  const isValid =
    text.trim() !== '' &&
    Number.isInteger(priority) &&
    priority >= MIN_PRIORITY &&
    priority <= MAX_PRIORITY;
  return isValid ? priority : null;
}

export function RuleForm({
  rule,
  categories,
  isPending,
  errorMessage,
  onSubmit,
  onCancel,
}: RuleFormProps) {
  const ids = { pattern: useId(), matchType: useId(), category: useId(), priority: useId() };
  const [pattern, setPattern] = useState(rule?.pattern ?? '');
  const [matchType, setMatchType] = useState<MatchType>(rule?.matchType ?? 'contains');
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '');
  const [priorityText, setPriorityText] = useState(String(rule?.priority ?? 0));
  const priority = parsePriority(priorityText);
  const canSubmit = pattern.trim() !== '' && categoryId !== '' && priority !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ pattern: pattern.trim(), matchType, categoryId, priority });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor={ids.pattern}>Texto da descrição</Label>
        <Input
          id={ids.pattern}
          value={pattern}
          maxLength={MAX_PATTERN_LENGTH}
          onChange={(event) => setPattern(event.target.value)}
          autoComplete="off"
          aria-describedby={`${ids.pattern}-hint`}
        />
        <p id={`${ids.pattern}-hint`} className="text-sm text-muted-foreground">
          Maiúsculas, minúsculas e acentos não fazem diferença.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={ids.matchType}>Comparação</Label>
        <Select
          id={ids.matchType}
          value={matchType}
          onChange={(event) => setMatchType(parseMatchType(event.target.value) ?? matchType)}
        >
          {MATCH_TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {MATCH_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={ids.category}>Categoria</Label>
        <CategorySelect
          id={ids.category}
          categories={categories}
          value={categoryId}
          emptyLabel="Escolha uma categoria"
          onValueChange={setCategoryId}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={ids.priority}>Prioridade</Label>
        <Input
          id={ids.priority}
          type="number"
          inputMode="numeric"
          min={MIN_PRIORITY}
          max={MAX_PRIORITY}
          value={priorityText}
          onChange={(event) => setPriorityText(event.target.value)}
          aria-invalid={priority === null}
          aria-describedby={`${ids.priority}-hint`}
        />
        <p id={`${ids.priority}-hint`} className="text-sm text-muted-foreground">
          Quando duas regras servem para a mesma transação, vence a de maior prioridade.
        </p>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || !canSubmit}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
