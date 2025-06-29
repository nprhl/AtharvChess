export class LocalStorageManager {
  static get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error);
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error);
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage for key ${key}:`, error);
    }
  }

  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  static exists(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}

// Game state management
export interface GameState {
  fen: string;
  moveHistory: string[];
  playerColor: 'w' | 'b';
  timeRemaining?: {
    white: number;
    black: number;
  };
}

export class GameStorageManager {
  private static readonly GAME_KEY = 'chess-current-game';
  private static readonly SETTINGS_KEY = 'chess-settings';
  private static readonly STATS_KEY = 'chess-stats';

  static saveGame(gameState: GameState): void {
    LocalStorageManager.set(this.GAME_KEY, gameState);
  }

  static loadGame(): GameState | null {
    return LocalStorageManager.get<GameState | null>(this.GAME_KEY, null);
  }

  static clearGame(): void {
    LocalStorageManager.remove(this.GAME_KEY);
  }

  static hasCurrentGame(): boolean {
    return LocalStorageManager.exists(this.GAME_KEY);
  }
}

// User preferences and settings
export interface UserPreferences {
  soundEnabled: boolean;
  showCoordinates: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  theme: 'dark' | 'light';
  autoSave: boolean;
}

export class PreferencesManager {
  private static readonly PREFERENCES_KEY = 'chess-preferences';

  static getPreferences(): UserPreferences {
    return LocalStorageManager.get<UserPreferences>(this.PREFERENCES_KEY, {
      soundEnabled: true,
      showCoordinates: false,
      animationSpeed: 'normal',
      theme: 'dark',
      autoSave: true
    });
  }

  static updatePreferences(preferences: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    const updated = { ...current, ...preferences };
    LocalStorageManager.set(this.PREFERENCES_KEY, updated);
  }
}
