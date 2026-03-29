import Cookies from 'js-cookie';
import type { IStorage } from './IStorage';

export class CookieStorage implements IStorage {
  private prefix: string;

  constructor(prefix = 'fantasy_') {
    this.prefix = prefix;
  }

  get<T>(key: string): T | null {
    try {
      const val = Cookies.get(this.prefix + key);
      if (val == null) return null;
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      Cookies.set(this.prefix + key, JSON.stringify(value), {
        expires: 365,
        sameSite: 'lax',
      });
    } catch {
      // ignore quota/security errors
    }
  }

  remove(key: string): void {
    Cookies.remove(this.prefix + key);
  }
}
