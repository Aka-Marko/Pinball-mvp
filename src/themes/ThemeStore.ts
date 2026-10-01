export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'neon-tilt.theme';

/** Remembers the selected theme id. Storage failures (private mode, disabled storage) are ignored. */
export class ThemeStore {
  private readonly storage: ThemeStorage | null;

  constructor(storage?: ThemeStorage | null) {
    this.storage = storage === undefined ? ThemeStore.browserStorage() : storage;
  }

  load(): string | null {
    try {
      return this.storage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  save(themeId: string): void {
    try {
      this.storage?.setItem(STORAGE_KEY, themeId);
    } catch {
      // Persisting the theme is a convenience only.
    }
  }

  private static browserStorage(): ThemeStorage | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  }
}
