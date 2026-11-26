// Entrada de `node dist/boot-check.js`: usada pelo deploy e pelo CI para provar que o build compilado
// carrega no Node e que o ambiente é válido, antes de a API subir (docs/05-deploy.md).
import { fileURLToPath } from 'node:url';

import { runBootCheck } from './shared/boot-check.js';

const distDirectory = fileURLToPath(new URL('.', import.meta.url));

const problems = await runBootCheck({ distDirectory, env: process.env });

if (problems.length === 0) {
  console.log('boot-check: ok');
} else {
  for (const problem of problems) {
    console.error(
      problem.kind === 'module'
        ? `boot-check: o módulo ${problem.file} não carrega: ${problem.reason}`
        : `boot-check: ${problem.message}`,
    );
  }
  process.exitCode = 1;
}
