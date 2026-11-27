import type { IStorage } from './IStorage';
import { CookieStorage } from './CookieStorage';
import { LocalStorage } from './LocalStorage';
import { WEEKS, getCurrentWeekKey } from '../types';
import type { PlayerEntry, TimeWindow, DisplayMode, WeekKey, EspnLeagueCredentials, RosterScenario } from '../types';

/**
 * StorageService is a singleton facade over an IStorage adapter.
 * Swap the adapter by calling StorageService.setAdapter() before first use.
 * e.g., to replace cookies with a DB-backed implementation:
 *   StorageService.setAdapter(new MyDbStorage())
 */
export class StorageService {
  private static instance: StorageService;
  private storage: IStorage;
  // ESPN cookies stay out of `storage` (cookies would be sent to the host with every request)
  private credentialStorage: IStorage = new LocalStorage();

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
    const saved = this.storage.get<WeekKey>('selected_week');
    return saved && WEEKS.some(w => w.key === saved) ? saved : getCurrentWeekKey();
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

  getEspnCredentials(): EspnLeagueCredentials | null {
    return this.credentialStorage.get<EspnLeagueCredentials>('espn_credentials');
  }

  setEspnCredentials(creds: EspnLeagueCredentials): void {
    this.credentialStorage.set('espn_credentials', creds);
  }

  // The draft roster on the Category Ranks tab. Kept in localStorage (cookies are too small) and
  // never touches the Head-to-Head rosters.
  // null = never edited, i.e. the same as the Head-to-Head roster
  getScenario(): RosterScenario | null {
    return this.credentialStorage.get<RosterScenario>('rank_scenario');
  }

  setScenario(scenario: RosterScenario | null): void {
    if (scenario) this.credentialStorage.set('rank_scenario', scenario);
    else this.credentialStorage.remove('rank_scenario');
  }

  clearEspnCredentials(): void {
    this.credentialStorage.remove('espn_credentials');
  }
}
