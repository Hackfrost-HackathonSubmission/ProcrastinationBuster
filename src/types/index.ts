export interface TimerSettings {
  focusDuration: number;
  breakDuration: number;
  isActive: boolean;
  startTime?: number;
  endTime?: number;
}

export interface BlockedSite {
  url: string;
  addedAt: number;
}
