## Why

Sem categoria, as transações não viram orçamento, gastos por categoria nem relatórios. O Valora precisa categorizar sozinho, com regras previsíveis que você controla e que aprendem com as suas correções, sem nunca desfazer uma categoria que você escolheu.

## What Changes

- Cria as categorias padrão na primeira execução, de forma idempotente. Incluem:
  - "Pagamento de fatura", "Transferência entre contas" e "Aplicação e resgate", do tipo `transfer`;
  - "Saque", do tipo `expense`.
- Cria o mapeamento das categorias do Pluggy para as categorias do Valora, com um mapeamento inicial montado a partir da lista real de categorias do Pluggy.
- Implementa as regras de categorização (`contains`, `starts_with`, `equals`) sobre a descrição normalizada, com prioridade.
- Implementa a ordem de decisão: categoria escolhida por você → regra → mapeamento do Pluggy → sem categoria.
- Liga a categorização à sincronização: as transações novas e as que ainda não têm categoria do usuário são categorizadas ao final de cada sincronização.
- Aplica uma regra nova às transações existentes que não têm categoria escolhida por você.
- Expõe a função "aprender com a correção", que cria uma regra a partir de uma transação. A change `transactions-screen` usa essa função.
- Cria a API de categorias, regras e mapeamentos e a tela "Categorias e regras" (no rodapé do menu).

Itens do roadmap cobertos (Fase 1 → Categorias):
- Categorias padrão criadas na primeira execução.
- Mapeamento das categorias do Pluggy.
- Regras: contém, começa com, igual; com prioridade.
- Ordem de decisão: você → regra → Pluggy → "Sem categoria".
- Tela de categorias e regras.

O item "Ao corrigir uma categoria, opção 'Aplicar sempre'" é dividido: a lógica de criar a regra fica aqui, e o botão na tela fica em `transactions-screen`.

Esta change acrescenta "Aplicação e resgate" (tipo `transfer`) às categorias padrão do roadmap. Sem ela, mover dinheiro entre a conta e um investimento contaria como despesa ou receita.

## Capabilities

### New Capabilities

- `transaction-categorization`: categorias e seus tipos, categorias padrão, mapeamento do Pluggy, regras, ordem de decisão, aplicação na sincronização, aprendizado com correções e a tela de gestão.

### Modified Capabilities

Nenhuma. A integração com a sincronização é um passo novo, sem mudar os requisitos de `open-finance-sync`.

## Impact

- **Código novo:** `backend/src/modules/categories/` (service, repositories, rotas, seed) e `frontend/src/features/categories/`.
- **Código alterado:** `SyncService` chama a categorização no final de cada item.
- **API:**
  - `GET/POST/PUT /api/v1/categories` e `POST /api/v1/categories/:id/archive`;
  - `GET/POST/PUT/DELETE /api/v1/category-rules`;
  - `GET /api/v1/pluggy-category-mappings` e `PUT /api/v1/pluggy-category-mappings/:pluggyCategory`.
- **Documentação:**
  - categorias padrão em `docs/04-modelo-de-dados.md`;
  - "Aplicação e resgate" acrescentada ao roadmap.

## Fora do escopo

- Trocar a categoria pela lista de transações e o botão "Aplicar sempre" (`transactions-screen`).
- Categoria de transação manual: é sempre escolhida por você (`manual-transactions`).
- Cores por categoria: categorias não têm cor (Design System, "Gastos por categoria").
- Subcategorias e IA para sugerir categoria.
