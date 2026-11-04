import { AreaNotReady } from '@/components/states/area-not-ready';
import { findAreaByPath } from '@/lib/areas';

export function Component() {
  const area = findAreaByPath('/contas');
  if (!area) throw new Error('Área /contas não está na lista de áreas');
  return <AreaNotReady area={area} />;
}
