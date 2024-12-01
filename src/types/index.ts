// src/types/index.ts
export interface FocusTask {
  id: string;
  title: string;
  duration: number;
  isCompleted: boolean;
  createdAt: Date;
  timeSpent?: number;
}

export interface TimerState {
  timeLeft: number;
  isActive: boolean;
  isBreak: boolean;
  settings: {
    focusDuration: number;
    breakDuration: number;
    volume: number;
  };
}
