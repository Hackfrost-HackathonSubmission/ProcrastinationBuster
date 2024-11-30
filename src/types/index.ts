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

export interface SiteVisit {
  url: string;
  domain: string;
  timeSpent: number;
  lastVisit: string;
}

export interface Settings {
  isEnabled: boolean;
  focusMode: boolean;
  focusTimer: number;
  breakTimer: number;
  currentSession: TimerSession | null;
  blockedSites: string[];
  stats: Stats;
  siteStats?: {
    dailyStats: SiteVisit[];
    lastUpdate: string;
  };
}

export type StorageKey = keyof Settings;
