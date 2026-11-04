import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// O Design System manda usar tokens (bg-card, text-muted-foreground...), nunca hex direto.
// O globals.css é a única fonte de hex e fica fora da verificação.
const CHECKED_DIRECTORIES = ['src/components', 'src/features'];
const HEX_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const SOURCE_FILE_PATTERN = /\.(ts|tsx|css)$/;
const TEST_FILE_PATTERN = /\.test\.(ts|tsx)$/;
// Os componentes do shadcn/ui (src/components/ui) usam tokens, então também passam na verificação.

export interface HexColorViolation {
  readonly file: string;
  readonly line: number;
  readonly color: string;
}

export function findHexColors(source: string): { line: number; color: string }[] {
  const violations: { line: number; color: string }[] = [];
  source.split('\n').forEach((lineText, lineIndex) => {
    for (const match of lineText.matchAll(HEX_COLOR_PATTERN)) {
      violations.push({ line: lineIndex + 1, color: match[0] });
    }
  });
  return violations;
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name))
    .filter((entry) => !TEST_FILE_PATTERN.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

export function checkDirectories(rootDirectory: string): HexColorViolation[] {
  return CHECKED_DIRECTORIES.flatMap((directory) => {
    let files: string[];
    try {
      files = listSourceFiles(join(rootDirectory, directory));
    } catch {
      return []; // Pasta ainda não existe (ex.: src/features antes da primeira tela).
    }
    return files.flatMap((file) =>
      findHexColors(readFileSync(file, 'utf8')).map((violation) => ({
        file: relative(rootDirectory, file),
        ...violation,
      })),
    );
  });
}

function main(): void {
  const rootDirectory = process.cwd();
  const violations = checkDirectories(rootDirectory);
  if (violations.length === 0) return;
  for (const { file, line, color } of violations) {
    process.stderr.write(
      `${file}:${line} usa cor direta ${color}; use um token do Design System\n`,
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
