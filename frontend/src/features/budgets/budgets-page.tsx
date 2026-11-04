import { AreaNotReady } from '@/components/states/area-not-ready';
import { findAreaByPath } from '@/lib/areas';

export function Component() {
  const area = findAreaByPath('/orcamentos');
  if (!area) throw new Error('Área /orcamentos não está na lista de áreas');
  return <AreaNotReady area={area} />;
}
