import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkDirectories, findForbiddenEffects, findHexColors } from '../scripts/check-tokens.ts';

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

describe('findForbiddenEffects', () => {
  it('should_report_the_effect_when_backdrop_blur_is_used', () => {
    // Arrange
    const source = '<header className="sticky bg-background/95 backdrop-blur" />';
    // Act
    const violations = findForbiddenEffects(source);
    // Assert
    expect(violations).toEqual([{ line: 1, effect: 'backdrop-blur' }]);
  });

  it('should_report_the_effect_when_a_gradient_class_is_used', () => {
    // Arrange
    const source = '<div className="bg-gradient-to-r from-primary" />';
    // Act
    const violations = findForbiddenEffects(source);
    // Assert
    expect(violations).toEqual([{ line: 1, effect: 'bg-gradient-to-r' }]);
  });

  it('should_report_the_effect_when_a_linear_gradient_class_is_used', () => {
    // Arrange
    const source = '<div className="bg-linear-to-b" />';
    // Act
    const violations = findForbiddenEffects(source);
    // Assert
    expect(violations).toEqual([{ line: 1, effect: 'bg-linear-to-b' }]);
  });

  it('should_report_nothing_when_only_tokens_are_used', () => {
    // Arrange
    const source = '<div className="bg-card text-muted-foreground shadow-card" />';
    // Act
    const violations = findForbiddenEffects(source);
    // Assert
    expect(violations).toEqual([]);
  });
});

describe('checkDirectories with forbidden effects', () => {
  it('should_point_at_the_file_when_a_component_uses_backdrop_blur', () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), 'valora-tokens-'));
    mkdirSync(join(root, 'src/components'), { recursive: true });
    writeFileSync(join(root, 'src/components/header.tsx'), 'const c = "backdrop-blur";');
    // Act
    const violations = checkDirectories(root);
    // Assert
    expect(violations.map((violation) => violation.file)).toEqual([
      join('src/components', 'header.tsx'),
    ]);
  });

  it('should_point_at_the_file_when_a_feature_uses_a_gradient', () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), 'valora-tokens-'));
    mkdirSync(join(root, 'src/features'), { recursive: true });
    writeFileSync(join(root, 'src/features/page.tsx'), 'const c = "bg-gradient-to-r";');
    // Act
    const violations = checkDirectories(root);
    // Assert
    expect(violations.map((violation) => violation.file)).toEqual([
      join('src/features', 'page.tsx'),
    ]);
  });

  it('should_report_nothing_when_a_component_only_uses_tokens', () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), 'valora-tokens-'));
    mkdirSync(join(root, 'src/components'), { recursive: true });
    writeFileSync(join(root, 'src/components/card.tsx'), 'const c = "bg-card shadow-card";');
    // Act
    const violations = checkDirectories(root);
    // Assert
    expect(violations).toEqual([]);
  });
});
