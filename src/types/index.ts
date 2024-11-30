// src/types/index.ts

export interface Settings {
     isEnabled: boolean;
     focusMode: boolean;
     focusTimer: number;
     breakTimer: number;
     currentSession: Session | null;
     blockedSites: string[];
     stats: Stats;
   }
   
   export interface Session {
     startTime: number;
     duration: number;
     type: 'focus' | 'break';
   }
   
   export interface Stats {
     dailyFocusTime: number;
     distractions: number;
     lastUpdate: string;
     focusSessions: FocusSession[];
     streak: {
       current: number;
       best: number;
       lastDate: string;
     };
   }
   
   export interface FocusSession {
     startTime: number;
     duration: number;
     completionRate: number;
     distractions: number;
   }
   
   export type StorageKey = keyof Settings;