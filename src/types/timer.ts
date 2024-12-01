export interface TimerSession {
  userId: string;
  taskTitle: string;
  duration: number;
  actualDuration: number;
  startTime: Date;
  endTime: Date;
  completed: boolean;
}

export interface SessionStats {
  totalMinutes: number;
  sessionCount: number;
  completionRate: number;
  averageEfficiency: number;
  lastSessionDate: Date;
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

export interface FocusTask {
  id: string;
  title: string;
  duration: number;
  isCompleted: boolean;
  createdAt: Date;
  timeSpent?: number;
}
