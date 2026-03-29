import type { IStorage } from './IStorage';
import { CookieStorage } from './CookieStorage';
import type { PlayerEntry, TimeWindow, DisplayMode, WeekKey } from '../types';

/**
 * StorageService is a singleton facade over an IStorage adapter.
 * Swap the adapter by calling StorageService.setAdapter() before first use.
 * e.g., to replace cookies with a DB-backed implementation:
 *   StorageService.setAdapter(new MyDbStorage())
 */
export class StorageService {
  private static instance: StorageService;
  private storage: IStorage;

  private constructor(storage: IStorage) {
    this.storage = storage;
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService(new CookieStorage());
    }
    return StorageService.instance;
  }

  static setAdapter(storage: IStorage): void {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService(storage);
    } else {
      StorageService.instance.storage = storage;
    }
  }

  getMyPlayers(): PlayerEntry[] {
    return this.storage.get<PlayerEntry[]>('my_players') ?? [];
  }

  setMyPlayers(players: PlayerEntry[]): void {
    this.storage.set('my_players', players);
  }

  getOppPlayers(): PlayerEntry[] {
    return this.storage.get<PlayerEntry[]>('opp_players') ?? [];
  }

  setOppPlayers(players: PlayerEntry[]): void {
    this.storage.set('opp_players', players);
  }

  getMyTeamName(): string {
    return this.storage.get<string>('my_team_name') ?? 'My Team';
  }

  setMyTeamName(name: string): void {
    this.storage.set('my_team_name', name);
  }

  getOppTeamName(): string {
    return this.storage.get<string>('opp_team_name') ?? 'Opponent';
  }

  setOppTeamName(name: string): void {
    this.storage.set('opp_team_name', name);
  }

  getSelectedWeek(): WeekKey {
    return this.storage.get<WeekKey>('selected_week') ?? 'week1';
  }

  setSelectedWeek(week: WeekKey): void {
    this.storage.set('selected_week', week);
  }

  getTimeWindow(): TimeWindow {
    return this.storage.get<TimeWindow>('time_window') ?? 'season';
  }

  setTimeWindow(tw: TimeWindow): void {
    this.storage.set('time_window', tw);
  }

  getDisplayMode(): DisplayMode {
    return this.storage.get<DisplayMode>('display_mode') ?? 'avg';
  }

  setDisplayMode(mode: DisplayMode): void {
    this.storage.set('display_mode', mode);
  }
}
