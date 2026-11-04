import { z } from 'zod';

// Todo valor em dinheiro é um inteiro em centavos (negativo = saída). `z.int()` já recusa
// casas decimais e números fora do inteiro seguro do JavaScript.
export const centsSchema = z.int();
