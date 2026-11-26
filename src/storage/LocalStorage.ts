import type { IStorage } from './IStorage';

// Unlike cookies, localStorage is never sent to the server, so it's used for credentials.
export class LocalStorage implements IStorage {
  private prefix: string;

  constructor(prefix = 'fantasy_') {
    this.prefix = prefix;
  }

  get<T>(key: string): T | null {
    try {
      const val = window.localStorage.getItem(this.prefix + key);
      if (val == null) return null;
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      // ignore quota/security errors
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(this.prefix + key);
    } catch {
      // ignore security errors
    }
  }
}
