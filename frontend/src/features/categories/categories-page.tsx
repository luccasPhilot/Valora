import { AreaNotReady } from '@/components/states/area-not-ready';
import { findAreaByPath } from '@/lib/areas';

export function Component() {
  const area = findAreaByPath('/categorias');
  if (!area) throw new Error('Área /categorias não está na lista de áreas');
  return <AreaNotReady area={area} />;
}
