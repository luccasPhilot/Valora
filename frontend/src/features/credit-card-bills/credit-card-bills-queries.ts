import { useQuery } from '@tanstack/react-query';

import { getCreditCardBills } from '@/lib/api/credit-card-bills';
import { queryKeys } from '@/lib/query-keys';

export function useCreditCardBills() {
  return useQuery({ queryKey: queryKeys.creditCardBills, queryFn: getCreditCardBills });
}
