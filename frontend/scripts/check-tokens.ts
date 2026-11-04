import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// O Design System manda usar tokens (bg-card, text-muted-foreground...), nunca hex direto,
// e proíbe gradiente e desfoque de fundo nas superfícies.
// O globals.css é a única fonte de hex e fica fora da verificação.
const CHECKED_DIRECTORIES = ['src/components', 'src/features'];
const HEX_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const FORBIDDEN_EFFECT_PATTERN = /\b(?:bg-gradient-|bg-linear-|backdrop-blur)[\w-]*/g;
const SOURCE_FILE_PATTERN = /\.(ts|tsx|css)$/;
const TEST_FILE_PATTERN = /\.test\.(ts|tsx)$/;
// Os componentes do shadcn/ui (src/components/ui) usam tokens, então também passam na verificação.

export interface TokenViolation {
  readonly file: string;
  readonly line: number;
  readonly found: string;
  readonly reason: string;
}

function findMatches(source: string, pattern: RegExp): { line: number; found: string }[] {
  const matches: { line: number; found: string }[] = [];
  source.split('\n').forEach((lineText, lineIndex) => {
    for (const match of lineText.matchAll(pattern)) {
      matches.push({ line: lineIndex + 1, found: match[0] });
    }
  });
  return matches;
}

export function findHexColors(source: string): { line: number; color: string }[] {
  return findMatches(source, HEX_COLOR_PATTERN).map(({ line, found }) => ({ line, color: found }));
}

export function findForbiddenEffects(source: string): { line: number; effect: string }[] {
  return findMatches(source, FORBIDDEN_EFFECT_PATTERN).map(({ line, found }) => ({
    line,
    effect: found,
  }));
}

function findViolations(file: string, source: string): TokenViolation[] {
  const hexViolations = findHexColors(source).map(({ line, color }) => ({
    file,
    line,
    found: color,
    reason: 'usa cor direta; use um token do Design System',
  }));
  const effectViolations = findForbiddenEffects(source).map(({ line, effect }) => ({
    file,
    line,
    found: effect,
    reason: 'usa gradiente ou desfoque de fundo, proibidos pelo Design System',
  }));
  return [...hexViolations, ...effectViolations];
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name))
    .filter((entry) => !TEST_FILE_PATTERN.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

export function checkDirectories(rootDirectory: string): TokenViolation[] {
  return CHECKED_DIRECTORIES.flatMap((directory) => {
    let files: string[];
    try {
      files = listSourceFiles(join(rootDirectory, directory));
    } catch {
      return []; // Pasta ainda não existe (ex.: src/features antes da primeira tela).
    }
    return files.flatMap((file) =>
      findViolations(relative(rootDirectory, file), readFileSync(file, 'utf8')),
    );
  });
}

function main(): void {
  const rootDirectory = process.cwd();
  const violations = checkDirectories(rootDirectory);
  if (violations.length === 0) return;
  for (const { file, line, found, reason } of violations) {
    process.stderr.write(`${file}:${line} ${reason} (${found})\n`);
  }
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
