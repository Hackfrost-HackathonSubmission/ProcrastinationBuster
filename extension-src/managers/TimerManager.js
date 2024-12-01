import SettingsManager from "./SettingsManager.js";
export const TIMER_STATES = {
  IDLE: "idle",
  FOCUS: "focus",
  BREAK: "break",
  PAUSED: "paused",
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
      lastCompletedDate: null,
    };
    // Initialize SettingsManager instance
    this.settingsManager = SettingsManager.getInstance();
  }

  // Add initialize method
  async initialize() {
    try {
      // Initialize settings first
      await this.settingsManager.initialize();

      // Load saved timer state if exists
      const data = await chrome.storage.local.get(["timerState", "streakData"]);
      if (data.timerState) {
        this.timerState = data.timerState;
      }
      if (data.streakData) {
        this.streakData = data.streakData;
      }
    } catch (error) {
      console.error("Failed to initialize timer:", error);
    }
  }

  // Update startTimer to use settings
  async startTimer(minutes, type = TIMER_STATES.FOCUS) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // If minutes not provided, get from settings
    if (!minutes) {
      const settings = await this.settingsManager.getSettings();
      minutes =
        type === TIMER_STATES.FOCUS
          ? settings.focusDuration
          : settings.shortBreakDuration;
    }

    this.currentSession = {
      startTime: Date.now(),
      duration: minutes * 60 * 1000,
      type: type,
      completedIntervals: 0,
    };

    this.timerState = type;
    this.remainingTime = minutes * 60;

    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    await this.updateBadgeState();

    // Use settings for break reminder
    if (type === TIMER_STATES.FOCUS) {
      const settings = await this.settingsManager.getSettings();
      if (settings.notifications?.breakReminders) {
        this.scheduleBreakReminder(minutes);
      }
    }

    chrome.runtime.sendMessage({
      action: "timerStarted",
      data: { minutes, type },
    });
  }

  // Update endTimer to handle auto-start breaks
  async endTimer(completed = true) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    if (completed && this.currentSession) {
      await this.updateStreak();
      await this.updateSessionStats();

      const settings = await this.settingsManager.getSettings();

      // Show completion notification if enabled
      if (settings.notifications?.enabled) {
        this.showCompletionNotification();
      }

      chrome.runtime.sendMessage({
        action: "timerCompleted",
        data: {
          sessionType: this.currentSession.type,
          duration: this.currentSession.duration,
        },
      });

      // Auto start break if enabled
      if (
        this.currentSession.type === TIMER_STATES.FOCUS &&
        settings.autoStartBreaks
      ) {
        const breakDuration = settings.shortBreakDuration;
        await this.startTimer(breakDuration, TIMER_STATES.BREAK);
        return;
      }
    }

    this.currentSession = null;
    this.timerState = TIMER_STATES.IDLE;
    this.remainingTime = 0;
    await this.updateBadgeState();
  }

  // Add method for showing notifications
  async showCompletionNotification() {
    const settings = await this.settingsManager.getSettings();
    if (settings.notifications?.enabled) {
      const message =
        this.currentSession.type === TIMER_STATES.FOCUS
          ? "Focus session completed! Time for a break."
          : "Break time is over! Ready to focus again?";

      chrome.notifications.create({
        type: "basic",
        iconUrl: "/icon48.png",
        title: "ProcrastinationBuster",
        message: message,
        silent: !settings.notifications.sound,
      });
    }
  }
  async resumeTimer() {
    if (this.timerState === TIMER_STATES.PAUSED) {
      this.timerInterval = setInterval(() => this.updateTimer(), 1000);
      this.timerState = this.currentSession.type;
      await this.updateBadgeState();

      chrome.runtime.sendMessage({
        action: "timerResumed",
        data: { remainingTime: this.remainingTime },
      });
    }
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
      const isStreakValid =
        this.streakData.lastCompletedDate === yesterday.toLocaleDateString();

      this.streakData.currentStreak = isStreakValid
        ? this.streakData.currentStreak + 1
        : 1;
      this.streakData.lastCompletedDate = today;
      this.currentSession.completedIntervals = 1;

      // Save streak data
      await chrome.storage.local.set({ streakData: this.streakData });

      // Notify if streak milestone reached
      if (this.streakData.currentStreak % 5 === 0) {
        chrome.runtime.sendMessage({
          action: "streakMilestone",
          data: { streak: this.streakData.currentStreak },
        });
      }
    }
  }

  async updateSessionStats() {
    if (!this.currentSession) return;

    const stats = (await chrome.storage.local.get("sessionStats")) || {
      sessionStats: {},
    };
    const today = new Date().toLocaleDateString();

    if (!stats.sessionStats[today]) {
      stats.sessionStats[today] = {
        focusSessions: 0,
        breakSessions: 0,
        totalFocusTime: 0,
        totalBreakTime: 0,
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

    const color =
      this.timerState === TIMER_STATES.FOCUS
        ? "#4CAF50"
        : this.timerState === TIMER_STATES.BREAK
        ? "#2196F3"
        : this.timerState === TIMER_STATES.PAUSED
        ? "#FFA000"
        : "#9E9E9E";

    await chrome.action.setBadgeBackgroundColor({ color });
  }

  getBadgeText() {
    if (this.timerState === TIMER_STATES.IDLE) return "";
    if (this.timerState === TIMER_STATES.PAUSED) return "||";
    return Math.ceil(this.remainingTime / 60).toString();
  }

  scheduleBreakReminder(focusMinutes) {
    const reminderTime = focusMinutes * 60 * 1000 - 5 * 60 * 1000; // 5 minutes before end
    setTimeout(() => {
      if (this.timerState === TIMER_STATES.FOCUS) {
        chrome.runtime.sendMessage({
          action: "breakReminder",
          data: { timeLeft: 5 },
        });
      }
    }, reminderTime);
  }

  getTimerState() {
    return {
      state: this.timerState,
      remainingTime: this.remainingTime,
      currentSession: this.currentSession,
      streakData: this.streakData,
    };
  }
}

export default TimerManager;
