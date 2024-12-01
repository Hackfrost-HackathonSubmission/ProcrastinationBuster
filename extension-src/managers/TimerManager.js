// extension-src/managers/TimerManager.js

export const TIMER_STATES = {
     IDLE: 'idle',
     FOCUS: 'focus',
     BREAK: 'break',
     PAUSED: 'paused'
 };
 
 export class TimerManager {
     constructor() {
         this.currentSession = null;
         this.timerState = TIMER_STATES.IDLE;
         this.remainingTime = 0;
         this.timerInterval = null;
         this.lastActiveTime = Date.now();
         this.streakData = {
             currentStreak: 0,
             lastCompletedDate: null
         };
     }
 
     static getInstance() {
         if (!TimerManager.instance) {
             TimerManager.instance = new TimerManager();
         }
         return TimerManager.instance;
     }
 
     initializeTimerState() {
         return {
             state: TIMER_STATES.IDLE,
             remainingTime: 0,
             startTime: null,
             duration: 0,
             type: null
         };
     }
 
     async startTimer(minutes, type = TIMER_STATES.FOCUS) {
         if (this.timerInterval) {
             clearInterval(this.timerInterval);
         }
 
         this.currentSession = {
             startTime: Date.now(),
             duration: minutes * 60 * 1000,
             type: type,
             completedIntervals: 0
         };
 
         this.timerState = type;
         this.remainingTime = minutes * 60;
 
         this.timerInterval = setInterval(() => this.updateTimer(), 1000);
         await this.updateBadgeState();
 
         // Schedule break reminder if it's a focus session
         if (type === TIMER_STATES.FOCUS) {
             this.scheduleBreakReminder(minutes);
         }
 
         // Notify other managers
         chrome.runtime.sendMessage({
             action: 'timerStarted',
             data: { minutes, type }
         });
     }
 
     async pauseTimer() {
         if (this.timerState !== TIMER_STATES.IDLE) {
             clearInterval(this.timerInterval);
             this.timerState = TIMER_STATES.PAUSED;
             await this.updateBadgeState();
 
             chrome.runtime.sendMessage({
                 action: 'timerPaused',
                 data: { remainingTime: this.remainingTime }
             });
         }
     }
 
     async resumeTimer() {
         if (this.timerState === TIMER_STATES.PAUSED) {
             this.timerInterval = setInterval(() => this.updateTimer(), 1000);
             this.timerState = this.currentSession.type;
             await this.updateBadgeState();
 
             chrome.runtime.sendMessage({
                 action: 'timerResumed',
                 data: { remainingTime: this.remainingTime }
             });
         }
     }
 
     async endTimer(completed = true) {
         if (this.timerInterval) {
             clearInterval(this.timerInterval);
         }
 
         if (completed && this.currentSession) {
             await this.updateStreak();
             await this.updateSessionStats();
             
             chrome.runtime.sendMessage({
                 action: 'timerCompleted',
                 data: {
                     sessionType: this.currentSession.type,
                     duration: this.currentSession.duration
                 }
             });
         }
 
         this.currentSession = null;
         this.timerState = TIMER_STATES.IDLE;
         this.remainingTime = 0;
         await this.updateBadgeState();
     }
 
     updateTimer() {
         if (this.remainingTime > 0) {
             this.remainingTime--;
             this.updateBadgeState();
         } else {
             this.endTimer(true);
         }
     }
 
     async updateStreak() {
         if (this.currentSession?.type !== TIMER_STATES.FOCUS) return;
 
         const today = new Date().toLocaleDateString();
         
         if (this.streakData.lastCompletedDate === today) {
             // Already completed a session today, just increment completed intervals
             this.currentSession.completedIntervals++;
         } else {
             // Check if streak is still valid (no more than one day gap)
             const yesterday = new Date();
             yesterday.setDate(yesterday.getDate() - 1);
             const isStreakValid = this.streakData.lastCompletedDate === 
                 yesterday.toLocaleDateString();
 
             this.streakData.currentStreak = isStreakValid ? 
                 this.streakData.currentStreak + 1 : 1;
             this.streakData.lastCompletedDate = today;
             this.currentSession.completedIntervals = 1;
 
             // Save streak data
             await chrome.storage.local.set({ streakData: this.streakData });
 
             // Notify if streak milestone reached
             if (this.streakData.currentStreak % 5 === 0) {
                 chrome.runtime.sendMessage({
                     action: 'streakMilestone',
                     data: { streak: this.streakData.currentStreak }
                 });
             }
         }
     }
 
     async updateSessionStats() {
         if (!this.currentSession) return;
 
         const stats = await chrome.storage.local.get('sessionStats') || { sessionStats: {} };
         const today = new Date().toLocaleDateString();
         
         if (!stats.sessionStats[today]) {
             stats.sessionStats[today] = {
                 focusSessions: 0,
                 breakSessions: 0,
                 totalFocusTime: 0,
                 totalBreakTime: 0
             };
         }
 
         const sessionType = this.currentSession.type;
         const duration = Math.floor(this.currentSession.duration / 60000); // Convert to minutes
 
         if (sessionType === TIMER_STATES.FOCUS) {
             stats.sessionStats[today].focusSessions++;
             stats.sessionStats[today].totalFocusTime += duration;
         } else {
             stats.sessionStats[today].breakSessions++;
             stats.sessionStats[today].totalBreakTime += duration;
         }
 
         await chrome.storage.local.set({ sessionStats: stats.sessionStats });
     }
 
     async updateBadgeState() {
         const text = this.getBadgeText();
         await chrome.action.setBadgeText({ text });
         
         const color = this.timerState === TIMER_STATES.FOCUS ? '#4CAF50' : 
                      this.timerState === TIMER_STATES.BREAK ? '#2196F3' : 
                      this.timerState === TIMER_STATES.PAUSED ? '#FFA000' : '#9E9E9E';
         
         await chrome.action.setBadgeBackgroundColor({ color });
     }
 
     getBadgeText() {
         if (this.timerState === TIMER_STATES.IDLE) return '';
         if (this.timerState === TIMER_STATES.PAUSED) return '||';
         return Math.ceil(this.remainingTime / 60).toString();
     }
 
     scheduleBreakReminder(focusMinutes) {
         const reminderTime = (focusMinutes * 60 * 1000) - (5 * 60 * 1000); // 5 minutes before end
         setTimeout(() => {
             if (this.timerState === TIMER_STATES.FOCUS) {
                 chrome.runtime.sendMessage({
                     action: 'breakReminder',
                     data: { timeLeft: 5 }
                 });
             }
         }, reminderTime);
     }
 
     getTimerState() {
         return {
             state: this.timerState,
             remainingTime: this.remainingTime,
             currentSession: this.currentSession,
             streakData: this.streakData
         };
     }
 }
 
 export default TimerManager;