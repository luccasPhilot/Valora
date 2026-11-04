## Context

Depende de `sync-open-finance`, que grava `pluggy_category`, `description_normalized` e `category_source = 'none'`. O modelo de dados já tem `categories`, `category_rules` e `pluggy_category_mappings`. O Design System define que categorias não têm cor, só ícone.

## Goals / Non-Goals

**Goals:**
- Categorização automática, previsível e explicável (dá para saber por que cada transação caiu numa categoria).
- Correção sua nunca é desfeita.
- Uma regra nova vale também para o passado.

**Non-Goals:**
- Subcategorias, cores por categoria, sugestão por IA.

## Decisions

**1. Categorização como função pura + aplicação em lote.**
- `decideCategory(transaction, rules, mappings)` não acessa o banco e devolve `{ categoryId, source }`.
- O service carrega regras e mapeamentos uma vez e aplica a função em lote.
- Isso torna os testes de prioridade e ordem simples e rápidos.

**2. Reaplicação no banco, em lote.**
- Depois de criar ou alterar uma regra, o service recategoriza as transações com `category_source IN ('none', 'pluggy', 'rule')`, em lotes de 1.000.
- Para o volume de um usuário (alguns milhares de transações por ano), isso roda em segundos.
- *Alternativa:* uma única query SQL para todas as regras ficaria difícil de manter alinhada com a função pura.

**3. Integração com a sincronização.**
O `SyncService` chama `categorizationService.categorizeConnection(connectionId)` ao final de cada item, dentro da transação de banco do item.

**4. Mapeamento inicial do Pluggy montado a partir da lista real.**
- O Pluggy publica a própria lista de categorias.
- Na implementação, essa lista é obtida uma vez (pelo script de fixtures) e o mapeamento inicial é escrito num arquivo versionado `seed/pluggy-category-map.ts`.
- Categorias do Pluggy fora do arquivo ficam sem mapeamento até você escolher na tela.

**5. Seed idempotente por chave estável.**
- Cada categoria padrão tem uma `seed_key` (por exemplo, `credit_card_payment`) gravada numa coluna nova.
- O seed só cria a categoria se a chave não existir, mesmo que você tenha renomeado ou arquivado.
- *Alternativa:* comparar pelo nome recriaria categorias renomeadas.
- Coluna nova: `categories.seed_key` (texto, único, pode ser nulo), registrada em `docs/04-modelo-de-dados.md`.

**6. Regra aprendida usa `equals`.**
- Descrições como `PAG*JOSEDASILVA` são específicas; `contains` com a descrição inteira daria o mesmo resultado.
- `equals` deixa claro que a regra vale para aquela descrição exata.
- Você pode trocar para `contains` e encurtar o padrão na tela de regras.

**7. Tela em três abas.**
- Categorias, Regras e Pluggy (`Tabs`).
- Formulários em `Sheet` no celular e `Dialog` no computador.
- Ícone escolhido numa grade de ícones Lucide sugeridos, com busca.
- Feita com `/frontend-design:frontend-design` e `/ui-ux-pro-max` carregadas, seguindo o Design System.

## Risks / Trade-offs

- [Reaplicar regras em lote dentro de uma requisição pode demorar com muitos dados] → No volume esperado leva segundos; se passar de alguns segundos, vira tarefa em segundo plano com aviso na tela.
- [O mapeamento inicial do Pluggy errar para algumas categorias] → Ele é só um ponto de partida, editável na aba Pluggy, e regras sempre vencem.
- [Categoria "Saque" ser despesa e você também lançar à mão o que gastou com o dinheiro] → A regra de produto (docs/01-produto.md, Lançamento manual) orienta trocar o saque para uma transferência. A tela de Categorias explica isso numa linha.

## Migration Plan

- Uma migration adiciona `categories.seed_key`.
- O seed roda na inicialização, depois das migrations.
- Ao subir esta change com transações já sincronizadas, o seed dispara uma recategorização completa das transações sem categoria do usuário.

## Open Questions

- Lista exata de categorias do Pluggy, que define o mapeamento inicial (obtida na implementação).
