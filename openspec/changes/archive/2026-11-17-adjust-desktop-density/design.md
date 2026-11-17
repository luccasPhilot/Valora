## Context

O Design System usa medidas pensadas para toque (texto de 16 px, alvos de 44 px, cabeçalho de 72 px) em todas as telas. No computador com mouse, o usuário compensava dando zoom de 80% a 90% no navegador. O conteúdo também parava em 1200 px, e o Início tinha dois cards que esticavam até a altura do card de saldo sem ter o que mostrar.

Quase tudo no front já é medido em `rem` (Tailwind), exceto alguns valores fixos em px: o limite de 1200 px (6 componentes) e a altura de 72 px do cabeçalho do topo e do menu.

## Goals / Non-Goals

**Goals:**
- O app no computador com mouse parece com o navegador em 87% de zoom, sem o usuário precisar dar zoom.
- Aproveitar melhor telas largas.
- Sem cards vazios no Início e sem rolagem dentro de rolagem nos painéis de transação.
- Celular e telas de toque não mudam.

**Non-Goals:**
- Escala por faixa de largura, mais colunas em telas muito largas, outro componente para a lista de categorias (veja a proposta).
- Mudar cor, fonte, raio ou paleta de gráficos.

## Decisions

**1. Base de 14 px no `html`, só com mouse e 1024 px ou mais.** Uma regra `@media (min-width: 1024px) and (pointer: fine)` define `html { font-size: 87.5% }`. Como tudo é `rem`, texto, espaços, menu e alvos escalam juntos. A porcentagem (e não `14px`) mantém a preferência de tamanho de fonte do navegador.
- *Alternativa: `zoom` no `body`.* Descartada: não é padrão em todos os navegadores e quebra medidas de popover e de gráficos.
- *Alternativa: reescrever cada tamanho para uma versão "desktop".* Descartada: dezenas de classes em 40 arquivos para o mesmo efeito.
- Por que `pointer: fine` e não só largura: um tablet em paisagem tem 1024 px ou mais e continua precisando de 44 px de toque.

**2. Largura do conteúdo em `rem`.** `--container-content: 110rem` no `@theme` do Tailwind vira `max-w-content`, usado nos 6 lugares que repetiam `max-w-[1200px]`. Em `rem` ela acompanha a escala (1540 px com mouse, 1760 px em toque). Um nome só evita os valores divergirem.

**3. Cabeçalho de 72 px em `rem`.** `h-[72px]` vira `h-18` (4,5 rem) no topo da tela e no cabeçalho do menu, para os dois continuarem alinhados em qualquer escala.

**4. Card "Resultado do mês" calculado no front.** `monthIncomeCents − monthExpenseCents` já está disponível na resposta do Início, então não há mudança de API (regra do projeto: mudou o endpoint, os dois lados mudam; aqui nada muda). Três cards com a altura dividida em partes iguais (`grid-rows-3`) tiram o espaço vazio sem mexer na ordem dos blocos no celular. O resultado negativo usa a cor normal, porque `destructive` é só para estouro, erro e saldo negativo.

**5. Rolagem só no painel.** A lista de categorias perde `max-h-* overflow-y-auto` nos dois lugares. O painel (`Dialog` ou `Sheet`) já tinha `overflow-y-auto`.

**6. Rodapé do Salvar com `lg:-bottom-6`.** O `position: sticky` respeita o espaço interno do contêiner que rola, então `bottom-0` grudava o rodapé 24 px acima da borda do diálogo (que tem `p-6`). Um `bottom` negativo igual ao espaço interno cola o rodapé na borda. Abaixo de 1024 px o painel (`Sheet`) não tem esse espaço interno e continua com `bottom-0`.

## Risks / Trade-offs

- [Gráficos (Recharts) medem fonte e margens em px e não escalam] → os eixos ficam maiores que o resto com mouse. Aceito por agora; conferir ao ver os gráficos e, se incomodar, ler o tamanho-base no gráfico.
- [Alvos de clique com mouse caem de 44 para 38,5 px] → continuam acima do mínimo de 24 px do WCAG 2.2 (critério 2.5.8) e a regra de 44 px segue valendo em toque.
- [Lista de categorias longa deixa o painel comprido] → a busca filtra a lista e só o painel rola. Se virar problema, trocar por outro componente (fora do escopo).
- [Medidas em px nos documentos e nas specs ficam ambíguas] → o requisito "Densidade no computador" diz que todas valem na base de 16 px.

## Migration Plan

Só frontend, sem migração. O deploy é o de sempre (`infra/scripts/deploy.sh`). Para voltar, reverter o commit: a base de 14 px é uma regra de CSS e o resto são classes.

## Open Questions

- O valor de 14 px é adequado para o notebook (o usuário usava 80%) e para a tela grande (90%)? É um número só no `globals.css` e pode ser ajustado.
