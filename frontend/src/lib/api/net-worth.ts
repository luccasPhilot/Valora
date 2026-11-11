import { z } from 'zod';

import { apiGet } from '../api-client';

// Contrato de /net-worth. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/net-worth/net-worth.routes.ts). Tudo já chega calculado: o front só mostra.

const netWorthPartsShape = {
  accountsCents: z.int(),
  investmentsCents: z.int(),
  /** Positivo: é quanto se deve nos cartões; a tela mostra com `−`. */
  openBillsCents: z.int(),
  netWorthCents: z.int(),
};

const netWorthPointSchema = z.object({
  /** AAAA-MM. */
  month: z.string(),
  /** O dia que representa o mês (AAAA-MM-DD): o último com foto, ou hoje no mês atual. */
  date: z.iso.date(),
  ...netWorthPartsShape,
});

const netWorthSchema = z.object({
  current: z.object({ date: z.iso.date(), ...netWorthPartsShape }),
  /** Um ponto por mês que tem foto, do mais antigo ao mais recente. */
  points: z.array(netWorthPointSchema),
  /** Nulo sem uma foto de um dia anterior a hoje no mês. */
  monthChange: z.object({ cents: z.int(), percent: z.number().nullable() }).nullable(),
  /** Dia da foto mais antiga guardada; nulo sem nenhuma foto. */
  firstSnapshotDate: z.iso.date().nullable(),
});

export type NetWorthPoint = z.infer<typeof netWorthPointSchema>;
export type NetWorth = z.infer<typeof netWorthSchema>;

/** `from` é o primeiro mês do gráfico (`AAAA-MM`); o último é sempre o mês atual. */
export function getNetWorth(from: string): Promise<NetWorth> {
  return apiGet(`/net-worth?from=${from}`, netWorthSchema);
}
