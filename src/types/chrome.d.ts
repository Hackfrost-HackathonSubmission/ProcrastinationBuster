/// <reference types="chrome"/>

declare namespace Chrome {
  interface StorageData {
    currentSession?: {
      startTime: number;
      duration: number;
    };
    stats?: {
      dailyFocusTime: number;
      weeklyFocusTime: number;
      distractions: number;
      lastUpdate: string;
    };
    blockedSites?: string[];
    settings?: {
      isEnabled: boolean;
      defaultFocusTime: number;
    };
  }
}
