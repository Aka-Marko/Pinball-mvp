import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, THEMES, ThemeStore, getTheme, toCssColor, type ThemeStorage } from './index';
import { TABLE } from '../table';

describe('visual themes', () => {
  it('provides selectable, uniquely identified visual skins', () => {
    expect(THEMES.map((theme) => theme.id)).toContain(DEFAULT_THEME_ID);
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length);
    expect(THEMES.map((theme) => theme.name)).toEqual(['Neon Blue', 'Space', 'Industrial', 'Retro Arcade', 'Jungle']);
  });

  it('styles every geometry role used by the table', () => {
    for (const theme of THEMES) {
      for (const wall of TABLE.walls) expect(theme.walls[wall.role], `${theme.id} ${wall.role}`).toBeTypeOf('number');
      for (const post of TABLE.posts) expect(theme.posts[post.role], `${theme.id} ${post.role}`).toBeTypeOf('number');
      for (const light of TABLE.lights) {
        const style = theme.lights[light.role];
        expect(Array.isArray(style) ? style.length : style, `${theme.id} ${light.role}`).toBeTruthy();
      }
      expect(theme.bumpers.rings.length).toBeGreaterThan(0);
    }
  });

  it('contains no geometry, so any theme fits any table', () => {
    const geometryKeys = /^(x|y|width|height|radius|points|thickness)$/;
    const walk = (value: unknown, path: string): void => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, child] of Object.entries(value)) {
          expect(geometryKeys.test(key), `${path}.${key}`).toBe(false);
          walk(child, `${path}.${key}`);
        }
      }
    };
    for (const theme of THEMES) walk(theme, theme.id);
  });

  it('falls back to the default theme for unknown ids', () => {
    expect(getTheme('missing').id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(null).id).toBe(DEFAULT_THEME_ID);
    expect(getTheme('jungle').name).toBe('Jungle');
    expect(toCssColor(0x0a0b0c)).toBe('#0a0b0c');
  });
});

describe('ThemeStore', () => {
  it('persists the selected theme id', () => {
    const data = new Map<string, string>();
    const storage: ThemeStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    expect(new ThemeStore(storage).load()).toBeNull();
    new ThemeStore(storage).save('space');
    expect(new ThemeStore(storage).load()).toBe('space');
  });

  it('ignores unavailable or failing storage', () => {
    const failing: ThemeStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(new ThemeStore(failing).load()).toBeNull();
    expect(() => new ThemeStore(failing).save('space')).not.toThrow();
    expect(new ThemeStore(null).load()).toBeNull();
  });
});
