/** O `LEIA-ME.txt` do `.zip`: como ler os CSVs sem o Valora. */
export const EXPORT_README = `Valora: cópia de todos os dados

Cada arquivo .csv é uma tabela do banco do Valora, com uma linha por registro e as colunas com os
mesmos nomes do banco (em inglês). É uma cópia para guardar e reprocessar, não para ler no Excel:
para isso, use "Exportar CSV" na tela de Transações.

Formato
- UTF-8, separador vírgula, fim de linha CRLF (RFC 4180). Campos com vírgula, aspas ou quebra de
  linha vêm entre aspas, com as aspas internas dobradas.
- Campo vazio é nulo; "" (aspas sem nada) é um texto vazio.
- Valores em dinheiro estão em centavos, como números inteiros, nas colunas terminadas em _cents.
  Exemplo: amount_cents = -8990 é uma saída de R$ 89,90.
- Valor negativo é saída de dinheiro; positivo é entrada.
- Datas de dia estão em AAAA-MM-DD. Instantes (colunas terminadas em _at) estão em ISO 8601, em
  UTC (o "Z" no fim); o horário de Brasília é 3 horas a menos.
- Colunas JSON (como stats em sync_runs) vêm como texto JSON.
- Os ids (uuid) ligam as tabelas: transactions.account_id aponta para accounts.id, e assim por
  diante.

O que fica de fora
- O JSON bruto recebido do Open Finance (coluna raw).
- As inscrições de notificação push (tabela push_subscriptions): são credenciais de envio do
  aparelho, não dado seu. O resto de cada tabela está aqui.

Todas as tabelas foram lidas de uma vez só, numa foto consistente do banco.

Este arquivo não restaura o Valora: para isso, use o backup do servidor.
`;
