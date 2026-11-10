import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { APP_MANIFEST } from './manifest';

const GLOBALS_CSS = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf-8');
const INDEX_HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');

function readBackgroundToken(selector: string): string {
  const blockStart = GLOBALS_CSS.indexOf(`${selector} {`);
  if (blockStart === -1) throw new Error(`Bloco ${selector} não encontrado no globals.css`);
  const block = GLOBALS_CSS.slice(blockStart, GLOBALS_CSS.indexOf('}', blockStart));
  const background = /--background:\s*(#[0-9a-fA-F]{6});/.exec(block)?.[1];
  if (!background) throw new Error(`--background não encontrado em ${selector}`);
  return background.toLowerCase();
}

function readThemeColorMeta(scheme: 'light' | 'dark'): string | undefined {
  const pattern = new RegExp(
    String.raw`<meta\s+name="theme-color"\s+content="(#[0-9a-fA-F]{6})"\s+media="\(prefers-color-scheme: ${scheme}\)"`,
  );
  return pattern.exec(INDEX_HTML)?.[1]?.toLowerCase();
}

describe('manifesto do PWA', () => {
  it('should_use_the_light_background_token_as_theme_color', () => {
    // Arrange
    const lightBackground = readBackgroundToken(':root');
    // Act
    const themeColor = APP_MANIFEST.theme_color?.toLowerCase();
    // Assert
    expect(themeColor).toBe(lightBackground);
  });

  it('should_use_the_light_background_token_as_background_color', () => {
    // Arrange
    const lightBackground = readBackgroundToken(':root');
    // Act
    const backgroundColor = APP_MANIFEST.background_color?.toLowerCase();
    // Assert
    expect(backgroundColor).toBe(lightBackground);
  });

  it('should_use_the_light_background_token_in_the_light_theme_color_meta', () => {
    // Arrange
    const lightBackground = readBackgroundToken(':root');
    // Act
    const meta = readThemeColorMeta('light');
    // Assert
    expect(meta).toBe(lightBackground);
  });

  it('should_use_the_dark_background_token_in_the_dark_theme_color_meta', () => {
    // Arrange
    const darkBackground = readBackgroundToken('.dark');
    // Act
    const meta = readThemeColorMeta('dark');
    // Assert
    expect(meta).toBe(darkBackground);
  });

  it('should_open_in_standalone_mode_with_the_valora_name_and_scope_root', () => {
    // Arrange
    // Act
    const { name, display, scope, start_url: startUrl, lang } = APP_MANIFEST;
    // Assert
    expect({ name, display, scope, startUrl, lang }).toEqual({
      name: 'Valora',
      display: 'standalone',
      scope: '/',
      startUrl: '/',
      lang: 'pt-BR',
    });
  });

  it('should_declare_192_512_and_a_maskable_512_icon', () => {
    // Arrange
    // Act
    const icons = (APP_MANIFEST.icons ?? []).map(
      ({ sizes, purpose }) => `${sizes}:${purpose ?? 'any'}`,
    );
    // Assert
    expect(icons).toEqual(['192x192:any', '512x512:any', '512x512:maskable']);
  });
});
