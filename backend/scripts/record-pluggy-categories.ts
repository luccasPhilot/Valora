// Grava a lista pública de categorias do Pluggy em test/fixtures/pluggy/categories.json. Roda só em
// desenvolvimento, com `npm run fixtures:categories`, e serve de base para o mapeamento inicial em
// src/modules/categories/seed/pluggy-category-map.ts. A lista é a mesma para todo mundo: não tem dados
// pessoais, então não precisa de anonimização.
import { mkdir, writeFile } from 'node:fs/promises';
import { PluggyClient } from 'pluggy-sdk';

import { loadConfig } from '../src/shared/config.js';

const FIXTURES_DIRECTORY = new URL('../test/fixtures/pluggy/', import.meta.url);

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const client = new PluggyClient({
    clientId: config.pluggyClientId,
    clientSecret: config.pluggyClientSecret,
  });
  const { results } = await client.fetchCategories();
  const categories = results.map(({ id, description, parentId, parentDescription }) => ({
    id,
    description,
    parentId: parentId ?? null,
    parentDescription: parentDescription ?? null,
  }));
  await mkdir(FIXTURES_DIRECTORY, { recursive: true });
  const file = new URL('categories.json', FIXTURES_DIRECTORY);
  await writeFile(file, `${JSON.stringify({ categories }, null, 2)}\n`);
  process.stdout.write(`Categorias do Pluggy gravadas: ${categories.length}.\n`);
}

main().catch((error: unknown) => {
  const errorType = error instanceof Error ? error.name : 'erro desconhecido';
  process.stderr.write(`Falha ao gravar as categorias do Pluggy: ${errorType}\n`);
  process.exit(1);
});
