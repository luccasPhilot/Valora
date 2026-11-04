import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkDirectories, findHexColors } from '../scripts/check-tokens.ts';

describe('findHexColors', () => {
  it('should_report_color_and_line_when_a_hex_is_used_in_a_class', () => {
    // Arrange
    const source = 'const a = 1;\n<div className="bg-[#286B50]" />';
    // Act
    const violations = findHexColors(source);
    // Assert
    expect(violations).toEqual([{ line: 2, color: '#286B50' }]);
  });

  it('should_report_nothing_when_only_tokens_are_used', () => {
    // Arrange
    const source = '<div className="bg-card text-muted-foreground" />';
    // Act
    const violations = findHexColors(source);
    // Assert
    expect(violations).toEqual([]);
  });
});

describe('checkDirectories', () => {
  it('should_point_at_the_file_when_a_component_has_a_hex', () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), 'valora-tokens-'));
    mkdirSync(join(root, 'src/components'), { recursive: true });
    writeFileSync(join(root, 'src/components/card.tsx'), 'const color = "#286B50";');
    // Act
    const violations = checkDirectories(root);
    // Assert
    expect(violations.map((violation) => violation.file)).toEqual([
      join('src/components', 'card.tsx'),
    ]);
  });

  it('should_ignore_missing_directories_when_features_does_not_exist_yet', () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), 'valora-tokens-'));
    // Act
    const violations = checkDirectories(root);
    // Assert
    expect(violations).toEqual([]);
  });
});
