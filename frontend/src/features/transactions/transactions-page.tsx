import { AreaNotReady } from '@/components/states/area-not-ready';
import { findAreaByPath } from '@/lib/areas';

export function Component() {
  const area = findAreaByPath('/transacoes');
  if (!area) throw new Error('Área /transacoes não está na lista de áreas');
  return <AreaNotReady area={area} />;
}
