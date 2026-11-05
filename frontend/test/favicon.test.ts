import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SYMBOL_GREENS = ['#17894F', '#3FB873', '#A6EBB4'] as const;

const INDEX_HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');
const FAVICON_PATH = resolve(process.cwd(), 'public/favicon.svg');

describe('Favicon declaration', () => {
  it('should_declare_an_svg_icon_when_index_html_is_read', () => {
    // Arrange
    const iconLinkPattern = /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"\s*\/>/;
    // Act
    const hasIconLink = iconLinkPattern.test(INDEX_HTML);
    // Assert
    expect(hasIconLink).toBe(true);
  });

  it('should_have_the_icon_file_in_public_when_index_html_points_to_it', () => {
    // Arrange / Act
    const hasIconFile = existsSync(FAVICON_PATH);
    // Assert
    expect(hasIconFile).toBe(true);
  });
});

describe('Favicon file', () => {
  const favicon = readFileSync(FAVICON_PATH, 'utf-8');

  it('should_not_use_css_variables_when_the_browser_tab_cannot_see_app_tokens', () => {
    // Arrange / Act
    const usesCssVariables = favicon.includes('var(');
    // Assert
    expect(usesCssVariables).toBe(false);
  });

  it.each(SYMBOL_GREENS)('should_use_the_symbol_color_%s_when_favicon_is_read', (color) => {
    // Arrange / Act
    const hasColor = favicon.includes(color);
    // Assert
    expect(hasColor).toBe(true);
  });
});
