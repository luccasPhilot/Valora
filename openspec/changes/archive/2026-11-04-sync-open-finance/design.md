## Context

Depende de `setup-api-foundation`, que já criou as tabelas. O fluxo de sincronização está descrito em `docs/03-arquitetura.md` (seção Sincronização). Os limites do Meu Pluggy estão em `docs/02-open-finance.md`: 5 conexões, atualização a cada 24 h, histórico de 12 meses.

Duas coisas só se confirmam com dados reais:
- a convenção de sinal do Pluggy para conta e cartão;
- o formato exato das respostas.

## Goals / Non-Goals

**Goals:**
- Sincronização que pode rodar de novo sem duplicar e sem estragar correções do usuário.
- Um banco com problema não atrapalha os outros.
- Histórico guardado desde o primeiro dia (fotos de saldo e de investimentos).

**Non-Goals:**
- Categorização, duplicatas com manuais, faturas, alertas, telas.

## Decisions

**1. `PluggyClient` como fronteira.**
- Encapsula o `pluggy-sdk` e é o único lugar que conhece o formato do Pluggy.
- Expõe métodos com tipos do Valora: `getItem`, `listAccounts`, `listTransactions(accountId, from, to)` (já paginado) e `listInvestments`.
- Valida cada resposta com Zod (só os campos usados; o objeto inteiro vai para `raw`).
- Converte reais para centavos e normaliza o sinal.

**2. Normalização de sinal por tipo de conta, numa função pura.**
- `normalizeAmount(amount, accountType, transactionType)` concentra a regra.
- A implementação começa pela hipótese mais comum para cada tipo e é **confirmada com dados reais** (tarefa 2.1) antes de ligar a sincronização.
- O resultado vai para `docs/04-modelo-de-dados.md`.

**3. Ids dos bancos pelo `.env` (`PLUGGY_ITEM_IDS`).**
- Com o conector MeuPluggy, cada banco autorizado vira um item, e o id aparece no app Demo do dashboard.
- *Alternativa:* uma tela para colar o id. Para no máximo 5 bancos que quase nunca mudam, editar o `.env` e reiniciar é suficiente.
- Ver a pergunta em aberto sobre listar os itens pela API.

**4. Uma transação de banco de dados por item.**
Contas, fotos, transações e investimentos de um item são gravados juntos. Se algo falhar, aquele item volta ao estado anterior e a execução segue para o próximo.

**5. Gravação idempotente com `INSERT ... ON CONFLICT (pluggy_*_id) DO UPDATE`.**
Na atualização de transações, `category_id` e `category_source` só mudam quando `category_source <> 'user'`. Nesta change, as transações novas entram com `category_source = 'none'`.

**6. Janela e remoção de pendentes.**
- Conexão sem `last_synced_at` → 365 dias; com → 30 dias. As datas são calculadas com `todayInSaoPaulo()`.
- Depois de gravar, o service apaga as transações `open_finance` e `pending` daquela conta, dentro da janela, cujo id não voltou na resposta.
- O filtro `source = 'open_finance'` no `DELETE` é o que protege as manuais.

**7. Execução única por lock do PostgreSQL.**
- `pg_try_advisory_lock` com uma chave fixa no início da execução.
- Se o lock não for obtido, o disparo manual responde 409 e o agendamento só registra no log que pulou.
- *Alternativa:* uma flag em memória não protege contra reinício no meio da execução e não é compartilhada se um dia houver mais de um processo.

**8. Disparo manual assíncrono.**
- `POST /sync-runs` cria a linha em `sync_runs` como `running`, responde 202 e roda a sincronização em segundo plano no mesmo processo.
- O front acompanha por `GET /sync-runs/latest`.

**9. Agendamento com `croner`.**
Tem suporte nativo a fuso horário (`timezone: 'America/Sao_Paulo'`), é escrito em TypeScript e não tem dependências.
- *Alternativa:* `node-cron` exige mais cuidado com o fuso.

**10. Mapeamento de status do item.**
- Atualizado → `ok`; atualizando → `syncing`.
- Erro de login ou de usuário → `error`; consentimento expirado ou revogado → `consent_expired`.
- A mensagem para a tela é escrita pelo Valora, em português, e não copiada do Pluggy.

**11. Fixtures gravadas fora dos testes.**
- Um script `npm run fixtures:record (em backend/)` chama a API real uma vez em desenvolvimento.
- Ele anonimiza descrições, nomes, números de conta e ids, e grava JSON em `test/fixtures/pluggy/`.
- Os testes só leem esses arquivos; nunca chamam o Pluggy.

## Risks / Trade-offs

- [A hipótese de sinal estar errada para algum tipo de conta] → A tarefa de confirmação com dados reais vem antes da sincronização completa, e os testes cobrem conta e cartão com as fixtures reais anonimizadas.
- [Pendentes que mudam de id ao serem confirmadas podem gerar duplicata] → A remoção de pendentes que sumiram na janela cobre esse caso; as fixtures reais mostram se o Pluggy mantém o id.
- [Janela de 30 dias não pegar uma alteração mais antiga] → Raro. Se acontecer, um disparo manual com a janela de 365 dias resolve (pode virar opção depois).
- [O Meu Pluggy demorar a atualizar e a sincronização das 07:00 pegar dados de ontem] → O botão "sincronizar agora" cobre; o horário é configurável.

## Migration Plan

Nenhuma tabela nova. As variáveis novas entram no `.env.example` e no `.env` do desenvolvimento.

## Open Questions

- O Pluggy permite listar os itens da aplicação pela API? Se sim, `PLUGGY_ITEM_IDS` pode deixar de ser obrigatório. Confirmar na implementação.
- Convenção exata de sinal e de tipos de transação do Pluggy para conta e cartão (tarefa 2.1).
- Se os investimentos de todas as suas instituições aparecem pelo conector MeuPluggy.
