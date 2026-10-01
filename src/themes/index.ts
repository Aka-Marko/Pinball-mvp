import { INDUSTRIAL } from './industrial';
import { JUNGLE } from './jungle';
import { NEON_BLUE } from './neonBlue';
import { RETRO_ARCADE } from './retroArcade';
import { SPACE } from './space';
import type { VisualTheme } from './VisualTheme';

export type { VisualTheme } from './VisualTheme';
export { toCssColor } from './VisualTheme';
export { ThemeStore, type ThemeStorage } from './ThemeStore';

export const THEMES: readonly VisualTheme[] = [NEON_BLUE, SPACE, INDUSTRIAL, RETRO_ARCADE, JUNGLE];

export const DEFAULT_THEME_ID = NEON_BLUE.id;

export function getTheme(themeId: string | null | undefined): VisualTheme {
  return THEMES.find((theme) => theme.id === themeId) ?? NEON_BLUE;
}
