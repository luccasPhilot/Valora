import { z } from 'zod';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// A API fala `AAAA-MM`; o banco guarda o dia 1 do mês.
export const monthSchema = z
  .string()
  .regex(MONTH_PATTERN, { error: 'Informe o mês no formato AAAA-MM' })
  .transform((month) => `${month}-01`);
