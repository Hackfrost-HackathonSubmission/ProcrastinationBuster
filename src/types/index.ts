export interface TimerSession {
  startTime: number;
  duration: number;
  isBreak: boolean;
  isPaused: boolean;
  remainingTime: number;
}


export interface Streak {
  current: number;
  best: number;
  lastDate: string;
}

export interface Stats {
  dailyFocusTime: number;
  distractions: number;
  lastUpdate: string;
  focusSessions: TimerSession[];
  streak: Streak;
}

export interface Settings {
  isEnabled: boolean;
  focusMode: boolean;
  focusTimer: number;
  breakTimer: number;
  currentSession: TimerSession | null;
  blockedSites: string[];
  stats: Stats;
}

export type StorageKey = keyof Settings;
