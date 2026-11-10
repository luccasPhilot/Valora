import { useQuery } from '@tanstack/react-query';

import { getCreditCardBills } from '@/lib/api/credit-card-bills';

export const CREDIT_CARD_BILLS_QUERY_KEY = ['credit-card-bills'] as const;

export function useCreditCardBills() {
  return useQuery({ queryKey: CREDIT_CARD_BILLS_QUERY_KEY, queryFn: getCreditCardBills });
}
