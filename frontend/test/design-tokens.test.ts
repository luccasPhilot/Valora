import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type ThemeName = 'light' | 'dark';

interface ContrastPair {
  readonly foreground: string;
  readonly background: string;
  readonly minimumRatio: number;
}

const TEXT_MINIMUM_RATIO = 4.5;
const BOUNDARY_MINIMUM_RATIO = 3;
const GRAPHIC_MINIMUM_RATIO = 3;

const GLOBALS_CSS = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf-8');

function readThemeBlock(selector: string): string {
  const blockStart = GLOBALS_CSS.indexOf(`${selector} {`);
  if (blockStart === -1) throw new Error(`Bloco ${selector} não encontrado no globals.css`);
  return GLOBALS_CSS.slice(blockStart, GLOBALS_CSS.indexOf('}', blockStart));
}

function readThemeTokens(selector: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of readThemeBlock(selector).matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) tokens.set(name, value.trim());
  }
  return tokens;
}

const THEMES: Record<ThemeName, Map<string, string>> = {
  light: readThemeTokens(':root'),
  dark: readThemeTokens('.dark'),
};

function getToken(theme: ThemeName, name: string): string {
  const value = THEMES[theme].get(name);
  if (value === undefined) throw new Error(`Token --${name} ausente no tema ${theme}`);
  return value;
}

function toLinearChannel(channelValue: number): number {
  const normalized = channelValue / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hexColor: string): number {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    toLinearChannel(Number.parseInt(hexColor.slice(start, start + 2), 16)),
  );
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function getContrastRatio(firstColor: string, secondColor: string): number {
  const first = getRelativeLuminance(firstColor);
  const second = getRelativeLuminance(secondColor);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { foreground: 'foreground', background: 'background', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'foreground', background: 'card', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'foreground', background: 'muted', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'muted-foreground', background: 'background', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'muted-foreground', background: 'card', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'muted-foreground', background: 'muted', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'muted-foreground', background: 'accent', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'primary-foreground', background: 'primary', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'primary', background: 'card', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'primary', background: 'background', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'primary', background: 'secondary', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'secondary-foreground', background: 'secondary', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'accent-foreground', background: 'accent', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'destructive', background: 'card', minimumRatio: TEXT_MINIMUM_RATIO },
  {
    foreground: 'destructive-foreground',
    background: 'destructive',
    minimumRatio: TEXT_MINIMUM_RATIO,
  },
  { foreground: 'warning', background: 'warning-surface', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'warning', background: 'card', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'destructive', background: 'warning-surface', minimumRatio: GRAPHIC_MINIMUM_RATIO },
  { foreground: 'muted-foreground', background: 'sidebar', minimumRatio: TEXT_MINIMUM_RATIO },
  { foreground: 'input', background: 'card', minimumRatio: BOUNDARY_MINIMUM_RATIO },
  { foreground: 'ring', background: 'background', minimumRatio: BOUNDARY_MINIMUM_RATIO },
  { foreground: 'status-ok', background: 'card', minimumRatio: GRAPHIC_MINIMUM_RATIO },
  { foreground: 'status-warning', background: 'card', minimumRatio: GRAPHIC_MINIMUM_RATIO },
  { foreground: 'status-critical', background: 'card', minimumRatio: GRAPHIC_MINIMUM_RATIO },
  { foreground: 'chart-other', background: 'card', minimumRatio: GRAPHIC_MINIMUM_RATIO },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => ({
    foreground: `chart-${slot}`,
    background: 'card',
    minimumRatio: GRAPHIC_MINIMUM_RATIO,
  })),
];

const THEME_NAMES: readonly ThemeName[] = ['light', 'dark'];

describe.each(THEME_NAMES)('Design tokens contrast (%s theme)', (theme) => {
  it.each(CONTRAST_PAIRS)(
    'should_meet_minimum_contrast_when_$foreground_is_over_$background',
    ({ foreground, background, minimumRatio }) => {
      // Arrange
      const foregroundColor = getToken(theme, foreground);
      const backgroundColor = getToken(theme, background);
      // Act
      const ratio = getContrastRatio(foregroundColor, backgroundColor);
      // Assert
      expect(ratio).toBeGreaterThanOrEqual(minimumRatio);
    },
  );
});

describe('Design tokens palette', () => {
  it('should_use_near_black_background_when_theme_is_dark', () => {
    // Arrange / Act
    const background = getToken('dark', 'background');
    // Assert
    expect(background).toBe('#0a0a0b');
  });

  it('should_use_white_card_when_theme_is_light', () => {
    // Arrange / Act
    const card = getToken('light', 'card');
    // Assert
    expect(card).toBe('#ffffff');
  });

  it('should_use_dark_card_when_theme_is_dark', () => {
    // Arrange / Act
    const card = getToken('dark', 'card');
    // Assert
    expect(card).toBe('#121214');
  });

  it('should_use_strong_green_primary_when_theme_is_light', () => {
    // Arrange / Act
    const primary = getToken('light', 'primary');
    // Assert
    expect(primary).toBe('#027a48');
  });

  it('should_use_bright_green_primary_when_theme_is_dark', () => {
    // Arrange / Act
    const primary = getToken('dark', 'primary');
    // Assert
    expect(primary).toBe('#32d583');
  });

  it('should_use_card_radius_of_20px_when_reading_base_radius', () => {
    // Arrange / Act
    const radius = getToken('light', 'radius');
    // Assert
    expect(radius).toBe('1.25rem');
  });
});

const NEUTRAL_DARK_TOKENS = [
  'background',
  'card',
  'popover',
  'sidebar',
  'muted',
  'secondary',
  'accent',
  'border',
] as const;
const MAXIMUM_CHANNEL_SPREAD = 4;

function getChannelSpread(hexColor: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hexColor.slice(start, start + 2), 16));
  return Math.max(...channels) - Math.min(...channels);
}

describe('Design tokens dark theme neutrality', () => {
  it.each(NEUTRAL_DARK_TOKENS)('should_have_no_green_tint_when_token_is_%s', (tokenName) => {
    // Arrange
    const color = getToken('dark', tokenName);
    // Act
    const spread = getChannelSpread(color);
    // Assert
    expect(spread).toBeLessThanOrEqual(MAXIMUM_CHANNEL_SPREAD);
  });
});
