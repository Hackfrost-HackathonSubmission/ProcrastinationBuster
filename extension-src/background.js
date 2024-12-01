// Screen Time Related Global Variables
const SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_HISTORY_DAYS = 30;
const IDLE_THRESHOLD = 30; // seconds
let lastScreenTimeSave = Date.now();
let screenTimeData = {
  date: new Date().toISOString().split("T")[0],
  totalTime: 0,
  sites: {},
  focusSessionTime: 0,
  productiveTime: 0,
  distractingTime: 0,
  categories: {}, // New: Track time by site category
  hourlyBreakdown: Array(24).fill(0), // New: Track usage by hour
};

// Compression utility for storage optimization
const compression = {
  // LZ-string compression implementation
  compress: (obj) => {
    try {
      return LZString.compress(JSON.stringify(obj));
    } catch (e) {
      console.error("Compression failed:", e);
      return JSON.stringify(obj);
    }
  },
  decompress: (str) => {
    try {
      return JSON.parse(LZString.decompress(str));
    } catch (e) {
      console.error("Decompression failed:", e);
      return str;
    }
  },
};

// Rate-limited screen time update with idle detection
const updateScreenTimeThrottled = (() => {
  let lastUpdate = Date.now();
  const THROTTLE_INTERVAL = 1000; // 1 second minimum between updates

  return async () => {
    const now = Date.now();
    if (now - lastUpdate < THROTTLE_INTERVAL) return;
    lastUpdate = now;

    // Check if user is idle
    try {
      const state = await chrome.idle.queryState(IDLE_THRESHOLD);
      if (state !== "active") return;
    } catch (e) {
      console.error("Idle state check failed:", e);
    }

    await updateScreenTime();
  };
})();

async function updateScreenTime() {
  if (!activeTabId) return;

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastActiveTime) / 1000);
  if (elapsedSeconds <= 0) return;

  try {
    const tab = await chrome.tabs.get(activeTabId);
    if (!tab.url) return;

    const hostname = new URL(tab.url).hostname;
    const category = await getSiteCategory(hostname);
    const hour = new Date().getHours();

    // Update basic site data
    if (!screenTimeData.sites[hostname]) {
      screenTimeData.sites[hostname] = initializeSiteData(tab, hostname);
    }

    // Update detailed metrics
    updateSiteMetrics(hostname, elapsedSeconds, category, hour);

    // Periodic save to prevent data loss
    if (now - lastScreenTimeSave >= SAVE_INTERVAL) {
      await saveScreenTimeData();
      lastScreenTimeSave = now;
    }
  } catch (error) {
    console.error("Error in updateScreenTime:", error);
  }

  lastActiveTime = now;
}

function initializeSiteData(tab, hostname) {
  return {
    url: tab.url,
    timeSpent: 0,
    visits: 0,
    lastVisit: Date.now(),
    title: tab.title || hostname,
    focusTime: 0,
    distractions: 0,
    productivity: null, // Will be set by user or learned
    hourlyUsage: Array(24).fill(0),
  };
}

function updateSiteMetrics(hostname, elapsedSeconds, category, hour) {
  const site = screenTimeData.sites[hostname];

  // Update site-specific metrics
  site.timeSpent += elapsedSeconds;
  site.visits += 1;
  site.lastVisit = Date.now();
  site.hourlyUsage[hour] += elapsedSeconds;

  // Update category metrics
  if (!screenTimeData.categories[category]) {
    screenTimeData.categories[category] = { timeSpent: 0, sites: new Set() };
  }
  screenTimeData.categories[category].timeSpent += elapsedSeconds;
  screenTimeData.categories[category].sites.add(hostname);

  // Update global metrics
  screenTimeData.totalTime += elapsedSeconds;
  screenTimeData.hourlyBreakdown[hour] += elapsedSeconds;

  if (site.productivity === "productive") {
    screenTimeData.productiveTime += elapsedSeconds;
  } else if (site.productivity === "distracting") {
    screenTimeData.distractingTime += elapsedSeconds;
  }
}

async function saveScreenTimeData() {
  try {
    const compressedData = compression.compress(screenTimeData);
    await chrome.storage.local.set({
      currentScreenTime: compressedData,
      lastSave: Date.now(),
    });
  } catch (error) {
    console.error("Error saving screen time data:", error);
  }
}

async function getScreenTimeInsights() {
  try {
    const stats = await getScreenTimeStats();
    const insights = {
      mostProductiveHour: getMostProductiveHour(stats),
      mostDistractingWebsites: getTopDistractingSites(stats),
      productivityScore: calculateProductivityScore(stats),
      recommendations: generateRecommendations(stats),
      trends: analyzeTrends(stats),
    };
    return insights;
  } catch (error) {
    console.error("Error generating insights:", error);
    return null;
  }
}

function getMostProductiveHour(stats) {
  const hourlyProductivity = stats.today.hourlyBreakdown.map((time, hour) => ({
    hour,
    productivity: calculateHourlyProductivity(hour, stats),
  }));
  return hourlyProductivity.sort((a, b) => b.productivity - a.productivity)[0];
}

function calculateHourlyProductivity(hour, stats) {
  const productiveTime = Object.values(stats.today.sites)
    .filter((site) => site.productivity === "productive")
    .reduce((sum, site) => sum + (site.hourlyUsage[hour] || 0), 0);
  const totalTime = stats.today.hourlyBreakdown[hour];
  return totalTime > 0 ? (productiveTime / totalTime) * 100 : 0;
}

// Add periodic data save
setInterval(async () => {
  if (Object.keys(screenTimeData.sites).length > 0) {
    await saveScreenTimeData();
  }
}, SAVE_INTERVAL);

// Listen for idle state changes
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "active") {
    lastActiveTime = Date.now();
  } else {
    await updateScreenTime(); // Save current session before idle
  }
});

const TIMER_STATES = {
  FOCUS: "focus",
  BREAK: "break",
  IDLE: "idle",
};

let timerState = {
  currentState: TIMER_STATES.IDLE,
  startTime: null,
  endTime: null,
  duration: 0,
  remainingTime: 0,
  isPaused: false,
  pausedAt: null,
  streak: 0,
  todaysSessions: [],
  lastNotification: null,
};

function initializeTimerState() {
  chrome.storage.local.set({
    timerState: {
      ...timerState,
      lastReset: new Date().toISOString().split("T")[0],
    },
  });
}

async function startTimer(minutes, type = TIMER_STATES.FOCUS) {
  const now = Date.now();
  const endTime = now + minutes * 60 * 1000;

  timerState = {
    currentState: type,
    startTime: now,
    endTime: endTime,
    duration: minutes * 60,
    remainingTime: minutes * 60,
    isPaused: false,
    pausedAt: null,
  };

  await chrome.storage.local.set({ timerState });
  createTimerAlarm(minutes);
  updateBadgeState();

  if (type === TIMER_STATES.FOCUS) {
    await updateBlockingRules();
    scheduleBreakReminder(minutes);
  }

  return true;
}

async function pauseTimer() {
  if (!timerState.startTime || timerState.isPaused) return false;

  clearTimerAlarm();
  const now = Date.now();
  timerState.isPaused = true;
  timerState.pausedAt = now;
  timerState.remainingTime = Math.max(
    0,
    Math.floor((timerState.endTime - now) / 1000)
  );

  await chrome.storage.local.set({ timerState });
  updateBadgeState();
  await clearAllBlockingRules();

  return true;
}

async function resumeTimer() {
  if (!timerState.isPaused) return false;

  const now = Date.now();
  timerState.endTime = now + timerState.remainingTime * 1000;
  timerState.isPaused = false;
  timerState.pausedAt = null;

  await chrome.storage.local.set({ timerState });
  createTimerAlarm(Math.ceil(timerState.remainingTime / 60));
  updateBadgeState();

  if (timerState.currentState === TIMER_STATES.FOCUS) {
    await updateBlockingRules();
  }

  return true;
}

async function endTimer(completed = true) {
  clearTimerAlarm();

  if (completed && timerState.currentState === TIMER_STATES.FOCUS) {
    await updateStreak();
    await updateSessionStats();
  }

  timerState = {
    ...timerState,
    currentState: TIMER_STATES.IDLE,
    startTime: null,
    endTime: null,
    remainingTime: 0,
    isPaused: false,
    pausedAt: null,
  };

  await chrome.storage.local.set({ timerState });
  await clearAllBlockingRules();
  updateBadgeState();
  showTimerNotification(completed);
}

async function updateStreak() {
  const stats = await chrome.storage.local.get(["stats"]);
  const today = new Date().toISOString().split("T")[0];

  if (!stats.stats) stats.stats = { streak: 0, lastStreakDate: null };

  if (stats.stats.lastStreakDate === today) {
    stats.stats.streak++;
  } else if (isYesterday(stats.stats.lastStreakDate)) {
    stats.stats.streak++;
  } else {
    stats.stats.streak = 1;
  }

  stats.stats.lastStreakDate = today;
  await chrome.storage.local.set({ stats: stats.stats });
}

async function updateSessionStats() {
  const session = {
    startTime: timerState.startTime,
    endTime: Date.now(),
    duration: timerState.duration,
    type: timerState.currentState,
  };

  timerState.todaysSessions.push(session);
  await chrome.storage.local.set({ timerState });
}

function updateBadgeState() {
  const badgeText = getBadgeText();
  const badgeColor =
    timerState.currentState === TIMER_STATES.FOCUS ? "#E53935" : "#43A047";

  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

function getBadgeText() {
  if (!timerState.startTime) return "";

  const remaining = timerState.isPaused
    ? timerState.remainingTime
    : Math.max(0, Math.floor((timerState.endTime - Date.now()) / 1000));

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function scheduleBreakReminder(focusMinutes) {
  const reminderTime = Math.floor(focusMinutes * 0.75) * 60 * 1000;
  setTimeout(() => {
    if (
      timerState.currentState === TIMER_STATES.FOCUS &&
      !timerState.isPaused
    ) {
      showNotification(NOTIFICATION_TYPES.BREAK_REMINDER);
    }
  }, reminderTime);
}

function showTimerNotification(completed) {
  const type = completed
    ? NOTIFICATION_TYPES.TIMER_COMPLETE
    : NOTIFICATION_TYPES.FOCUS_REMINDER;
  showNotification(type);
}

function showNotification(type) {
  const now = Date.now();
  if (timerState.lastNotification && now - timerState.lastNotification < 30000)
    return;

  const notifications = {
    [NOTIFICATION_TYPES.TIMER_COMPLETE]: {
      title: "Timer Complete!",
      message:
        timerState.currentState === TIMER_STATES.FOCUS
          ? "Great job! Time for a break."
          : "Break time is over. Ready to focus?",
    },
    [NOTIFICATION_TYPES.BREAK_REMINDER]: {
      title: "Almost Done!",
      message: "Keep going! You're doing great.",
    },
    [NOTIFICATION_TYPES.FOCUS_REMINDER]: {
      title: "Focus Session Interrupted",
      message: "Remember to complete your session to maintain your streak!",
    },
  };

  const notification = notifications[type];
  chrome.notifications.create({
    type: "basic",
    iconUrl: "/icon48.png",
    ...notification,
    silent: false,
  });

  timerState.lastNotification = now;
}

function isYesterday(dateString) {
  if (!dateString) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0] === dateString;
}

const RULE_PRIORITIES = {
  BLOCK: 1,
  REDIRECT: 2,
  WHITELIST: 3,
};

const MAX_RULES = 5000;
let activeRuleIds = new Set();
let pendingRuleUpdates = new Map();
let lastRuleUpdate = 0;

const BLOCKED_CATEGORIES = ["social", "entertainment", "gaming", "shopping"];

const siteBlockingState = {
  isEnabled: false,
  rules: new Map(),
  whitelist: new Set(),
  customPatterns: new Set(),
  temporaryAllowed: new Map(),
  blockCount: 0,
};

async function initializeBlockingSystem() {
  const stored = await chrome.storage.local.get(["blockingState"]);
  if (stored.blockingState) {
    Object.assign(siteBlockingState, stored.blockingState);
  }
  await clearAllBlockingRules();
  await setupBaseRules();
}

async function updateBlockingRules() {
  const now = Date.now();
  if (now - lastRuleUpdate < 1000) {
    return scheduleRuleUpdate();
  }

  try {
    const [settings, currentSession] = await Promise.all([
      chrome.storage.sync.get(["isEnabled", "blockedSites"]),
      chrome.storage.local.get(["currentSession"]),
    ]);

    if (!shouldEnableBlocking(settings, currentSession)) {
      return await clearAllBlockingRules();
    }

    const rules = generateBlockingRules(settings.blockedSites);
    await applyRules(rules);
    lastRuleUpdate = now;
  } catch (error) {
    console.error("Rule update failed:", error);
    await clearAllBlockingRules();
  }
}

function scheduleRuleUpdate() {
  const updateId = setTimeout(async () => {
    await updateBlockingRules();
    pendingRuleUpdates.delete(updateId);
  }, 1000);
  pendingRuleUpdates.set(updateId, true);
}

function generateBlockingRules(blockedSites) {
  const rules = [];
  let ruleId = 1000;

  for (const site of blockedSites) {
    if (siteBlockingState.whitelist.has(site)) continue;
    if (
      siteBlockingState.temporaryAllowed.has(site) &&
      siteBlockingState.temporaryAllowed.get(site) > Date.now()
    )
      continue;

    rules.push({
      id: ruleId++,
      priority: RULE_PRIORITIES.BLOCK,
      action: {
        type: "redirect",
        redirect: { extensionPath: "/blocked.html" },
      },
      condition: {
        urlFilter: preprocessUrlPattern(site),
        resourceTypes: ["main_frame", "sub_frame"],
      },
    });

    if (rules.length >= MAX_RULES) break;
  }

  return rules;
}

function preprocessUrlPattern(site) {
  if (site.startsWith("regex:")) {
    return site.substring(6);
  }
  return site.replace(/^https?:\/\/(www\.)?/, "*://");
}

async function applyRules(rules) {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((rule) => rule.id);

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: rules,
    });
    activeRuleIds = new Set(rules.map((rule) => rule.id));
  } catch (error) {
    console.error("Rule application failed:", error);
    await clearAllBlockingRules();
  }
}

async function temporarilyAllowSite(site, minutes = 5) {
  siteBlockingState.temporaryAllowed.set(
    site,
    Date.now() + minutes * 60 * 1000
  );
  await chrome.storage.local.set({ blockingState: siteBlockingState });
  await updateBlockingRules();
}

async function addToWhitelist(site) {
  siteBlockingState.whitelist.add(site);
  await chrome.storage.local.set({ blockingState: siteBlockingState });
  await updateBlockingRules();
}

async function removeFromWhitelist(site) {
  siteBlockingState.whitelist.delete(site);
  await chrome.storage.local.set({ blockingState: siteBlockingState });
  await updateBlockingRules();
}

async function addCustomPattern(pattern) {
  try {
    new RegExp(pattern);
    siteBlockingState.customPatterns.add(pattern);
    await chrome.storage.local.set({ blockingState: siteBlockingState });
    await updateBlockingRules();
  } catch (error) {
    throw new Error("Invalid regex pattern");
  }
}

async function setupBaseRules() {
  const baseRules = [
    {
      id: 1,
      priority: RULE_PRIORITIES.WHITELIST,
      action: { type: "allow" },
      condition: {
        urlFilter: "*://localhost/*",
        resourceTypes: ["main_frame"],
      },
    },
    {
      id: 2,
      priority: RULE_PRIORITIES.WHITELIST,
      action: { type: "allow" },
      condition: {
        urlFilter: "*://127.0.0.1/*",
        resourceTypes: ["main_frame"],
      },
    },
  ];

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: baseRules,
  });
}

function shouldEnableBlocking(settings, currentSession) {
  return (
    settings.isEnabled &&
    currentSession?.currentSession &&
    !currentSession.currentSession.isPaused &&
    !currentSession.currentSession.isBreak
  );
}

async function clearAllBlockingRules() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (existingRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map((rule) => rule.id),
      });
    }
    activeRuleIds.clear();

    const enabledRulesets =
      await chrome.declarativeNetRequest.getEnabledRulesets();
    if (enabledRulesets.length > 0) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: enabledRulesets,
      });
    }
  } catch (error) {
    console.error("Error clearing rules:", error);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "temporarilyAllow") {
    temporarilyAllowSite(request.site, request.minutes)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

const analytics = ProductivityAnalytics;
async function initializeExtension() {
  try {
    await Promise.all([
      settingsManager.initialize(),
      notificationManager.initialize(),
      syncManager.initialize(),
      ProductivityAnalytics.initialize(),
    ]);

    setupEventListeners();
    startIdleDetection();
  } catch (error) {
    console.error("Extension initialization failed:", error);
  }
}
const ANALYTICS_VERSION = "1.0";
const ANALYTICS_INTERVALS = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

let analyticsState = {
  version: ANALYTICS_VERSION,
  lastUpdate: Date.now(),
  dailyStats: {},
  weeklyStats: {},
  monthlyStats: {},
  trends: {},
  goals: {},
};

class ProductivityAnalytics {
  static async initialize() {
    const stored = await chrome.storage.local.get(["analyticsState"]);
    if (stored.analyticsState) {
      analyticsState = stored.analyticsState;
    }
    await this.checkDataMigration();
  }

  static async updateStats(sessionData) {
    const today = new Date().toISOString().split("T")[0];
    const stats = await this.getDailyStats(today);

    stats.focusTime += sessionData.duration;
    stats.sessions.push({
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      duration: sessionData.duration,
      type: sessionData.type,
      completed: sessionData.completed,
    });

    await this.calculateProductivityMetrics(stats);
    await this.updateAggregateStats();
    await this.saveStats();
  }

  static async getDailyStats(date) {
    if (!analyticsState.dailyStats[date]) {
      analyticsState.dailyStats[date] = {
        date,
        focusTime: 0,
        breakTime: 0,
        distractions: 0,
        sessions: [],
        sites: {},
        productivity: 0,
        goals: {
          focusTime: 0,
          completed: false,
        },
      };
    }
    return analyticsState.dailyStats[date];
  }

  static async calculateProductivityMetrics(stats) {
    const totalPossibleTime = stats.sessions.reduce(
      (total, session) => total + session.duration,
      0
    );

    const completedTime = stats.sessions
      .filter((session) => session.completed)
      .reduce((total, session) => total + session.duration, 0);

    stats.productivity =
      totalPossibleTime > 0 ? (completedTime / totalPossibleTime) * 100 : 0;

    stats.streak = await this.calculateStreak();
    stats.improvement = await this.calculateImprovement(stats.date);
  }

  static async updateAggregateStats() {
    await this.updateWeeklyStats();
    await this.updateMonthlyStats();
    await this.updateTrends();
  }

  static async updateWeeklyStats() {
    const weekStart = this.getWeekStart();
    const weekKey = weekStart.toISOString().split("T")[0];

    analyticsState.weeklyStats[weekKey] = {
      startDate: weekKey,
      totalFocusTime: 0,
      averageProductivity: 0,
      completedSessions: 0,
      totalSessions: 0,
      topProductiveHours: [],
    };

    let totalProductivity = 0;
    let daysCount = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split("T")[0];
      const dayStats = analyticsState.dailyStats[dateKey];

      if (dayStats) {
        analyticsState.weeklyStats[weekKey].totalFocusTime +=
          dayStats.focusTime;
        totalProductivity += dayStats.productivity;
        daysCount++;
      }
    }

    if (daysCount > 0) {
      analyticsState.weeklyStats[weekKey].averageProductivity =
        totalProductivity / daysCount;
    }
  }

  static async updateMonthlyStats() {
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthKey = monthStart.toISOString().split("T")[0];

    analyticsState.monthlyStats[monthKey] = {
      startDate: monthKey,
      totalFocusTime: 0,
      averageProductivity: 0,
      bestDay: null,
      worstDay: null,
      improvement: 0,
    };

    let totalProductivity = 0;
    let daysCount = 0;
    let bestProductivity = 0;
    let worstProductivity = 100;

    Object.entries(analyticsState.dailyStats)
      .filter(([date]) => date.startsWith(monthKey.substring(0, 7)))
      .forEach(([date, stats]) => {
        analyticsState.monthlyStats[monthKey].totalFocusTime += stats.focusTime;
        totalProductivity += stats.productivity;
        daysCount++;

        if (stats.productivity > bestProductivity) {
          bestProductivity = stats.productivity;
          analyticsState.monthlyStats[monthKey].bestDay = date;
        }
        if (stats.productivity < worstProductivity) {
          worstProductivity = stats.productivity;
          analyticsState.monthlyStats[monthKey].worstDay = date;
        }
      });

    if (daysCount > 0) {
      analyticsState.monthlyStats[monthKey].averageProductivity =
        totalProductivity / daysCount;
    }
  }

  static async updateTrends() {
    analyticsState.trends = {
      productivity: await this.calculateProductivityTrend(),
      focusTime: await this.calculateFocusTimeTrend(),
      improvement: await this.calculateImprovementRate(),
    };
  }

  static async calculateProductivityTrend() {
    const last7Days = Object.entries(analyticsState.dailyStats)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .slice(0, 7)
      .map(([, stats]) => stats.productivity);

    return {
      trend: this.calculateTrendDirection(last7Days),
      average: last7Days.reduce((a, b) => a + b, 0) / last7Days.length,
    };
  }

  static async calculateFocusTimeTrend() {
    const last7Days = Object.entries(analyticsState.dailyStats)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .slice(0, 7)
      .map(([, stats]) => stats.focusTime);

    return {
      trend: this.calculateTrendDirection(last7Days),
      average: last7Days.reduce((a, b) => a + b, 0) / last7Days.length,
    };
  }

  static calculateTrendDirection(values) {
    if (values.length < 2) return "neutral";

    const trend = values
      .slice(0, -1)
      .reduce((acc, curr, i) => acc + (values[i + 1] - curr), 0);

    return trend > 0 ? "increasing" : trend < 0 ? "decreasing" : "neutral";
  }

  static async saveStats() {
    await chrome.storage.local.set({ analyticsState });
  }

  static getWeekStart() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay());
    return date;
  }

  static async checkDataMigration() {
    if (analyticsState.version !== ANALYTICS_VERSION) {
      await this.migrateData();
      analyticsState.version = ANALYTICS_VERSION;
      await this.saveStats();
    }
  }

  static async migrateData() {
    // Handle data structure changes between versions
  }
}

async function generateProductivityReport(
  interval = ANALYTICS_INTERVALS.DAILY
) {
  const stats = analyticsState[`${interval}Stats`];
  const latest = Object.values(stats).sort(
    (a, b) => new Date(b.startDate) - new Date(a.startDate)
  )[0];

  return {
    interval,
    data: latest,
    trends: analyticsState.trends,
    recommendations: generateRecommendations(latest),
  };
}

function generateRecommendations(stats) {
  const recommendations = [];

  if (stats.productivity < 70) {
    recommendations.push({
      type: "productivity",
      message:
        "Consider shorter focus sessions to maintain higher productivity",
    });
  }

  if (stats.distractions > 5) {
    recommendations.push({
      type: "distraction",
      message: "Try enabling stricter site blocking during focus sessions",
    });
  }

  return recommendations;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProductivityReport") {
    generateProductivityReport(request.interval)
      .then((report) => sendResponse({ success: true, report }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

const DEFAULT_SETTINGS = {
  version: "2.0",
  timer: {
    defaultFocusDuration: 25,
    defaultBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: true,
    autoStartNextSession: false,
  },
  blocking: {
    enabled: true,
    strictMode: false,
    allowTemporaryAccess: true,
    temporaryAccessDuration: 5,
    blockInBreaks: false,
  },
  notifications: {
    enabled: true,
    sound: true,
    volume: 0.7,
    showReminders: true,
    reminderInterval: 15,
  },
  productivity: {
    dailyGoal: 120,
    weeklyGoal: 600,
    workdays: [1, 2, 3, 4, 5],
    workHours: {
      start: "09:00",
      end: "17:00",
    },
  },
  theme: {
    mode: "system",
    color: "#4CAF50",
    showTimer: true,
    showProgress: true,
  },
  sync: {
    enabled: true,
    syncInterval: 30,
    lastSync: null,
  },
};

class SettingsManager {
  static instance = null;
  settings = DEFAULT_SETTINGS;
  observers = new Map();
  syncTimeout = null;

  static getInstance() {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  async initialize() {
    await this.loadSettings();
    await this.migrateSettingsIfNeeded();
    this.setupSyncHandler();
    return this.settings;
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get("settings");
      if (stored.settings) {
        this.settings = this.mergeSettings(DEFAULT_SETTINGS, stored.settings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  mergeSettings(defaults, saved) {
    const merged = {};
    for (const [key, value] of Object.entries(defaults)) {
      if (typeof value === "object" && !Array.isArray(value)) {
        merged[key] = this.mergeSettings(value, saved[key] || {});
      } else {
        merged[key] = saved[key] !== undefined ? saved[key] : value;
      }
    }
    return merged;
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ settings: this.settings });
      this.notifyObservers("settingsUpdated", this.settings);
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  }

  async updateSettings(path, value) {
    const pathArray = path.split(".");
    let current = this.settings;

    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }

    current[pathArray[pathArray.length - 1]] = value;
    await this.saveSettings();
    this.scheduleSyncIfEnabled();
  }

  async migrateSettingsIfNeeded() {
    if (this.settings.version !== DEFAULT_SETTINGS.version) {
      const oldVersion = this.settings.version;
      this.settings = this.mergeSettings(DEFAULT_SETTINGS, this.settings);
      this.settings.version = DEFAULT_SETTINGS.version;
      await this.saveSettings();
      this.notifyObservers("settingsMigrated", {
        oldVersion,
        newVersion: DEFAULT_SETTINGS.version,
      });
    }
  }

  setupSyncHandler() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync" && changes.settings) {
        this.handleRemoteSettingsChange(changes.settings.newValue);
      }
    });
  }

  async handleRemoteSettingsChange(newSettings) {
    if (JSON.stringify(this.settings) !== JSON.stringify(newSettings)) {
      this.settings = this.mergeSettings(DEFAULT_SETTINGS, newSettings);
      this.notifyObservers("settingsSynced", this.settings);
    }
  }

  scheduleSyncIfEnabled() {
    if (this.settings.sync.enabled) {
      if (this.syncTimeout) {
        clearTimeout(this.syncTimeout);
      }
      this.syncTimeout = setTimeout(() => {
        this.syncSettings();
      }, this.settings.sync.syncInterval * 1000);
    }
  }

  async syncSettings() {
    if (!this.settings.sync.enabled) return;

    try {
      const stored = await chrome.storage.sync.get("settings");
      if (stored.settings) {
        this.handleRemoteSettingsChange(stored.settings);
      }
      this.settings.sync.lastSync = Date.now();
      await this.saveSettings();
    } catch (error) {
      console.error("Settings sync failed:", error);
    }
  }

  addObserver(event, callback) {
    if (!this.observers.has(event)) {
      this.observers.set(event, new Set());
    }
    this.observers.get(event).add(callback);
  }

  removeObserver(event, callback) {
    if (this.observers.has(event)) {
      this.observers.get(event).delete(callback);
    }
  }

  notifyObservers(event, data) {
    if (this.observers.has(event)) {
      this.observers.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in settings observer for ${event}:`, error);
        }
      });
    }
  }

  async validateSettings() {
    const validationRules = {
      "timer.defaultFocusDuration": (value) => value >= 1 && value <= 120,
      "timer.defaultBreakDuration": (value) => value >= 1 && value <= 30,
      "productivity.dailyGoal": (value) => value >= 0 && value <= 1440,
      "notifications.reminderInterval": (value) => value >= 5 && value <= 60,
    };

    const errors = [];
    for (const [path, validator] of Object.entries(validationRules)) {
      const value = this.getSettingValue(path);
      if (!validator(value)) {
        errors.push(`Invalid value for ${path}: ${value}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  getSettingValue(path) {
    return path.split(".").reduce((obj, key) => obj?.[key], this.settings);
  }

  async exportSettings() {
    return {
      settings: this.settings,
      exportDate: new Date().toISOString(),
      version: this.settings.version,
    };
  }

  async importSettings(data) {
    if (!data.settings || !data.version) {
      throw new Error("Invalid settings data format");
    }

    const validation = await this.validateSettings();
    if (!validation.isValid) {
      throw new Error(
        "Invalid settings values: " + validation.errors.join(", ")
      );
    }

    this.settings = this.mergeSettings(DEFAULT_SETTINGS, data.settings);
    await this.saveSettings();
    return true;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    sendResponse({ settings: settingsManager.settings });
    return true;
  }
  if (request.action === "updateSettings") {
    settingsManager
      .updateSettings(request.path, request.value)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

const NOTIFICATION_TYPES = {
  TIMER: "timer",
  BREAK: "break",
  FOCUS: "focus",
  STREAK: "streak",
  GOAL: "goal",
  SYSTEM: "system",
};

const NOTIFICATION_PRIORITIES = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  URGENT: 3,
};

const AUDIO_PATHS = {
  timerEnd: "/assets/sounds/timer-end.mp3",
  break: "/assets/sounds/break.mp3",
  focus: "/assets/sounds/focus.mp3",
  achievement: "/assets/sounds/achievement.mp3",
};

class NotificationManager {
  static instance = null;
  notifications = [];
  audioElements = new Map();
  notificationQueue = [];
  isProcessingQueue = false;

  static getInstance() {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async initialize() {
    await this.loadAudioElements();
    this.setupNotificationHandlers();
    this.startQueueProcessor();
  }

  async loadAudioElements() {
    for (const [key, path] of Object.entries(AUDIO_PATHS)) {
      const audio = new Audio(chrome.runtime.getURL(path));
      audio.preload = "auto";
      this.audioElements.set(key, audio);
    }
  }

  setupNotificationHandlers() {
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });

    chrome.notifications.onButtonClicked.addListener(
      (notificationId, buttonIndex) => {
        this.handleNotificationButtonClick(notificationId, buttonIndex);
      }
    );

    chrome.notifications.onClosed.addListener((notificationId) => {
      this.removeNotification(notificationId);
    });
  }

  async createNotification(options) {
    const {
      type = NOTIFICATION_TYPES.SYSTEM,
      title,
      message,
      priority = NOTIFICATION_PRIORITIES.NORMAL,
      buttons = [],
      requireInteraction = false,
      soundEffect = null,
      data = {},
    } = options;

    const notificationId = `${type}_${Date.now()}`;
    const notification = {
      type: "basic",
      iconUrl: this.getIconForType(type),
      title,
      message,
      priority,
      requireInteraction,
      buttons: buttons.map((button) => ({
        title: button.text,
        iconUrl: button.icon || null,
      })),
      silent: !soundEffect,
      eventTime: Date.now(),
      data,
    };

    this.notificationQueue.push({
      id: notificationId,
      notification,
      soundEffect,
    });
    this.processQueue();

    return notificationId;
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.notificationQueue.length > 0) {
      const { id, notification, soundEffect } = this.notificationQueue.shift();

      try {
        await this.showNotification(id, notification);
        if (soundEffect && this.audioElements.has(soundEffect)) {
          await this.playSound(soundEffect);
        }
      } catch (error) {
        console.error("Error showing notification:", error);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.isProcessingQueue = false;
  }

  async showNotification(id, notification) {
    return new Promise((resolve, reject) => {
      chrome.notifications.create(id, notification, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          this.notifications.push({ id, ...notification });
          resolve(id);
        }
      });
    });
  }

  async playSound(soundKey) {
    const audio = this.audioElements.get(soundKey);
    if (audio) {
      audio.currentTime = 0;
      try {
        await audio.play();
      } catch (error) {
        console.error("Error playing notification sound:", error);
      }
    }
  }

  getIconForType(type) {
    const iconMap = {
      [NOTIFICATION_TYPES.TIMER]: "/assets/icons/timer.png",
      [NOTIFICATION_TYPES.BREAK]: "/assets/icons/break.png",
      [NOTIFICATION_TYPES.FOCUS]: "/assets/icons/focus.png",
      [NOTIFICATION_TYPES.STREAK]: "/assets/icons/streak.png",
      [NOTIFICATION_TYPES.GOAL]: "/assets/icons/goal.png",
      [NOTIFICATION_TYPES.SYSTEM]: "/assets/icons/system.png",
    };
    return iconMap[type] || iconMap[NOTIFICATION_TYPES.SYSTEM];
  }

  async handleNotificationClick(notificationId) {
    const notification = this.notifications.find(
      (n) => n.id === notificationId
    );
    if (!notification) return;

    switch (notification.data.action) {
      case "openTimer":
        await chrome.tabs.create({ url: "timer.html" });
        break;
      case "openStats":
        await chrome.tabs.create({ url: "stats.html" });
        break;
      case "openSettings":
        await chrome.tabs.create({ url: "settings.html" });
        break;
    }

    await this.removeNotification(notificationId);
  }

  async handleNotificationButtonClick(notificationId, buttonIndex) {
    const notification = this.notifications.find(
      (n) => n.id === notificationId
    );
    if (!notification || !notification.data.buttons) return;

    const button = notification.data.buttons[buttonIndex];
    if (button && button.action) {
      await this.executeButtonAction(button.action, notification.data);
    }

    await this.removeNotification(notificationId);
  }

  async executeButtonAction(action, data) {
    switch (action) {
      case "startBreak":
        await chrome.runtime.sendMessage({
          action: "startBreak",
          duration: data.breakDuration,
        });
        break;
      case "skipBreak":
        await chrome.runtime.sendMessage({
          action: "skipBreak",
        });
        break;
      case "extendSession":
        await chrome.runtime.sendMessage({
          action: "extendSession",
          duration: data.extensionDuration,
        });
        break;
    }
  }

  async removeNotification(notificationId) {
    const index = this.notifications.findIndex((n) => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      await chrome.notifications.clear(notificationId);
    }
  }

  async showTimerComplete(duration, type) {
    return this.createNotification({
      type: NOTIFICATION_TYPES.TIMER,
      title: `${type} Session Complete!`,
      message: `You've completed a ${duration} minute ${type.toLowerCase()} session.`,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      soundEffect: "timerEnd",
      buttons: [
        { text: "Start Break", action: "startBreak" },
        { text: "Continue Working", action: "skipBreak" },
      ],
      data: {
        action: "openTimer",
        breakDuration: Math.floor(duration / 5),
      },
    });
  }

  async showBreakReminder(timeLeft) {
    return this.createNotification({
      type: NOTIFICATION_TYPES.BREAK,
      title: "Break Reminder",
      message: `${timeLeft} minutes left in your focus session. Remember to take a break!`,
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      soundEffect: "break",
      data: { action: "openTimer" },
    });
  }

  async showStreakAchievement(streak) {
    return this.createNotification({
      type: NOTIFICATION_TYPES.STREAK,
      title: "New Streak Achievement!",
      message: `Congratulations! You've maintained your focus for ${streak} days in a row!`,
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      soundEffect: "achievement",
      data: { action: "openStats" },
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "createNotification") {
    notificationManager
      .createNotification(request.options)
      .then((id) => sendResponse({ success: true, id }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

class DataSyncManager {
  static instance = null;
  syncInProgress = false;
  lastSyncTime = null;
  syncQueue = [];
  retryAttempts = new Map();
  maxRetries = 3;

  static getInstance() {
    if (!DataSyncManager.instance) {
      DataSyncManager.instance = new DataSyncManager();
    }
    return DataSyncManager.instance;
  }

  constructor() {
    this.setupAutoSync();
    this.setupEventListeners();
  }

  async initialize() {
    await this.loadSyncState();
    await this.performInitialSync();
  }

  setupAutoSync() {
    setInterval(() => {
      this.scheduleSync("periodic");
    }, 30 * 60 * 1000); // Sync every 30 minutes
  }

  setupEventListeners() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local") {
        this.handleStorageChange(changes);
      }
    });

    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "syncChannel") {
        this.handlePortConnection(port);
      }
    });
  }

  async loadSyncState() {
    try {
      const state = await chrome.storage.local.get("syncState");
      if (state.syncState) {
        this.lastSyncTime = state.syncState.lastSync;
      }
    } catch (error) {
      console.error("Error loading sync state:", error);
    }
  }

  async performInitialSync() {
    if (!this.lastSyncTime) {
      await this.fullSync();
    } else {
      await this.incrementalSync();
    }
  }

  async scheduleSync(reason = "manual") {
    if (this.syncInProgress) {
      this.syncQueue.push(reason);
      return;
    }

    try {
      this.syncInProgress = true;
      await this.sync(reason);
    } finally {
      this.syncInProgress = false;
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.syncQueue.length > 0) {
      const nextSync = this.syncQueue.shift();
      await this.scheduleSync(nextSync);
    }
  }

  async sync(reason) {
    const syncStart = Date.now();
    const changes = await this.getChangedData();

    if (Object.keys(changes).length === 0) {
      return;
    }

    try {
      await this.uploadChanges(changes);
      await this.updateSyncState(syncStart);
      this.resetRetryCount();
    } catch (error) {
      await this.handleSyncError(error, changes);
    }
  }

  async getChangedData() {
    const changes = {};
    const dataTypes = ["settings", "stats", "timer", "blockList"];

    for (const type of dataTypes) {
      const data = await this.getLocalData(type);
      if (data && data.lastModified > (this.lastSyncTime || 0)) {
        changes[type] = data;
      }
    }

    return changes;
  }

  async getLocalData(type) {
    try {
      const data = await chrome.storage.local.get(type);
      return data[type];
    } catch (error) {
      console.error(`Error getting local data for ${type}:`, error);
      return null;
    }
  }

  async uploadChanges(changes) {
    const compressed = this.compressData(changes);
    await chrome.storage.sync.set({
      syncedData: compressed,
      lastSync: Date.now(),
    });
  }

  compressData(data) {
    try {
      const stringified = JSON.stringify(data);
      return LZString.compressToUTF16(stringified);
    } catch (error) {
      console.error("Error compressing data:", error);
      throw error;
    }
  }

  decompressData(compressed) {
    try {
      const decompressed = LZString.decompressFromUTF16(compressed);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error("Error decompressing data:", error);
      throw error;
    }
  }

  async updateSyncState(syncTime) {
    await chrome.storage.local.set({
      syncState: {
        lastSync: syncTime,
        status: "success",
      },
    });
    this.lastSyncTime = syncTime;
  }

  async handleSyncError(error, changes) {
    console.error("Sync error:", error);

    const retryCount = this.getRetryCount();
    if (retryCount < this.maxRetries) {
      await this.scheduleRetry(changes);
    } else {
      await this.handleSyncFailure(error);
    }
  }

  getRetryCount() {
    const now = Date.now();
    this.cleanupRetries(now);
    return this.retryAttempts.size;
  }

  cleanupRetries(now) {
    for (const [time] of this.retryAttempts) {
      if (now - time > 24 * 60 * 60 * 1000) {
        this.retryAttempts.delete(time);
      }
    }
  }

  async scheduleRetry(changes) {
    const retryDelay = Math.pow(2, this.getRetryCount()) * 1000;
    this.retryAttempts.set(Date.now(), changes);

    setTimeout(() => {
      this.scheduleSync("retry");
    }, retryDelay);
  }

  resetRetryCount() {
    this.retryAttempts.clear();
  }

  async handleSyncFailure(error) {
    await chrome.storage.local.set({
      syncState: {
        lastSync: this.lastSyncTime,
        status: "error",
        error: error.message,
      },
    });

    chrome.runtime.sendMessage({
      action: "syncError",
      error: error.message,
    });
  }

  async fullSync() {
    const allData = await this.getAllLocalData();
    await this.uploadChanges(allData);
  }

  async incrementalSync() {
    const changes = await this.getChangedData();
    if (Object.keys(changes).length > 0) {
      await this.uploadChanges(changes);
    }
  }

  async getAllLocalData() {
    const dataTypes = ["settings", "stats", "timer", "blockList"];
    const allData = {};

    for (const type of dataTypes) {
      allData[type] = await this.getLocalData(type);
    }

    return allData;
  }

  async exportData() {
    const data = await this.getAllLocalData();
    const backup = {
      data,
      timestamp: Date.now(),
      version: chrome.runtime.getManifest().version,
    };

    return {
      content: this.compressData(backup),
      filename: `procrastination_buster_backup_${new Date()
        .toISOString()
        .slice(0, 10)}.json`,
    };
  }

  async importData(backupData) {
    try {
      const decoded = this.decompressData(backupData);
      if (!this.validateBackup(decoded)) {
        throw new Error("Invalid backup data");
      }

      await this.restoreFromBackup(decoded.data);
      return true;
    } catch (error) {
      console.error("Import error:", error);
      throw error;
    }
  }

  validateBackup(backup) {
    return (
      backup &&
      backup.data &&
      backup.timestamp &&
      backup.version &&
      Object.keys(backup.data).length > 0
    );
  }

  async restoreFromBackup(data) {
    for (const [key, value] of Object.entries(data)) {
      await chrome.storage.local.set({ [key]: value });
    }
    await this.fullSync();
  }
}

const syncManager = DataSyncManager.getInstance();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "syncData") {
    syncManager
      .scheduleSync("manual")
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "exportData") {
    syncManager
      .exportData()
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "importData") {
    syncManager
      .importData(request.data)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

const settingsManager = SettingsManager.getInstance();
const notificationManager = NotificationManager.getInstance();
const activityTracker = ActivityTracker.getInstance();

// Extension state
let isEnabled = false;
let currentSession = null;
let focusTimer = null;
let lastActiveTime = Date.now();

// Initialize the extension
async function initializeExtension() {
  try {
    await Promise.all([
      settingsManager.initialize(),
      notificationManager.initialize(),
      syncManager.initialize(),
      activityTracker.initialize(),
    ]);

    isEnabled = (await settingsManager.getSettings()).enabled;
    setupEventListeners();
    startIdleDetection();
  } catch (error) {
    console.error("Extension initialization failed:", error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Listen for tab changes
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);

  // Listen for window focus changes
  chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);

  // Listen for messages from popup and content scripts
  chrome.runtime.onMessage.addListener(handleMessage);
}

// Handle tab activation
async function handleTabActivated(activeInfo) {
  if (!isEnabled || !currentSession) return;

  const tab = await chrome.tabs.get(activeInfo.tabId);
  await activityTracker.trackActivity({
    type: await determineActivityType(tab.url),
    url: tab.url,
  });
}

// Handle tab updates
function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.url) {
    handleTabActivated({ tabId });
  }
}

// Handle window focus changes
function handleWindowFocusChanged(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    lastActiveTime = Date.now();
  } else {
    const idleTime = Date.now() - lastActiveTime;
    if (idleTime > 5 * 60 * 1000) {
      // 5 minutes
      handleUserIdle(idleTime);
    }
  }
}

// Handle messages from popup and content scripts
function handleMessage(request, sender, sendResponse) {
  switch (request.action) {
    case "startSession":
      startFocusSession(request.duration);
      break;
    case "pauseSession":
      pauseSession();
      break;
    case "resumeSession":
      resumeSession();
      break;
    case "endSession":
      endSession();
      break;
    case "getStats":
      getActivityStats(request.timeRange).then(sendResponse);
      return true;
    case "getStatus":
      sendResponse({
        isEnabled,
        currentSession,
        lastActiveTime,
      });
      break;
  }
}

// Start a new focus session
async function startFocusSession(duration) {
  if (currentSession) {
    await endSession();
  }

  currentSession = {
    startTime: Date.now(),
    duration: duration * 60 * 1000, // Convert minutes to milliseconds
    remainingTime: duration * 60 * 1000,
    isPaused: false,
    type: "focus",
  };

  focusTimer = setInterval(updateSession, 1000);
  await activityTracker.trackActivity({
    type: "focus",
    timestamp: currentSession.startTime,
  });

  updateBadge();
}

// Update the current session
function updateSession() {
  if (!currentSession || currentSession.isPaused) return;

  currentSession.remainingTime -= 1000;

  if (currentSession.remainingTime <= 0) {
    endSession();
    notificationManager.showTimerComplete(
      currentSession.duration / (60 * 1000),
      currentSession.type
    );
  } else {
    updateBadge();
  }
}

// Pause the current session
function pauseSession() {
  if (!currentSession) return;
  currentSession.isPaused = true;
  updateBadge();
}

// Resume the current session
function resumeSession() {
  if (!currentSession) return;
  currentSession.isPaused = false;
  updateBadge();
}

// End the current session
async function endSession() {
  if (!currentSession) return;

  clearInterval(focusTimer);
  const sessionDuration = Date.now() - currentSession.startTime;

  await activityTracker.trackActivity({
    type: currentSession.type,
    duration: sessionDuration,
    timestamp: currentSession.startTime,
  });

  currentSession = null;
  updateBadge();
}

// Handle user idle state
async function handleUserIdle(idleTime) {
  if (!currentSession || currentSession.isPaused) return;

  pauseSession();
  notificationManager.createNotification({
    type: "SYSTEM",
    title: "Session Paused",
    message: `Session paused due to ${Math.round(
      idleTime / 60000
    )} minutes of inactivity`,
    priority: 1,
  });
}

// Start idle detection
function startIdleDetection() {
  chrome.idle.setDetectionInterval(300); // 5 minutes
  chrome.idle.onStateChanged.addListener((state) => {
    if (state === "idle" || state === "locked") {
      handleUserIdle(300000); // 5 minutes in milliseconds
    }
  });
}

// Update extension badge
function updateBadge() {
  if (!currentSession) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  const minutes = Math.ceil(currentSession.remainingTime / (60 * 1000));
  chrome.action.setBadgeText({
    text: currentSession.isPaused ? "❚❚" : minutes.toString(),
  });

  chrome.action.setBadgeBackgroundColor({
    color: currentSession.isPaused ? "#FFA500" : "#4CAF50",
  });
}

// Get activity statistics
async function getActivityStats(timeRange) {
  return await ProductivityAnalytics.getDailyStats(new Date());
}
// Determine activity type based on URL
async function determineActivityType(url) {
  if (!url) return "break";

  const settings = await settingsManager.getSettings();
  const blockedSites = settings.blocking.blockedSites || [];

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    if (blockedSites.includes(domain)) {
      return "distraction";
    }

    // Add your productivity site logic here
    const productiveSites = [
      "github.com",
      "docs.google.com",
      "stackoverflow.com",
    ];
    if (productiveSites.includes(domain)) {
      return "focus";
    }

    return "neutral";
  } catch (error) {
    return "neutral";
  }
}

// Initialize the extension
initializeExtension();

// Handle extension updates
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // Handle first installation
    await settingsManager.setDefaultSettings();
  } else if (details.reason === "update") {
    // Handle extension update
    await syncManager.fullSync();
  }
});

// Handle extension unload
chrome.runtime.onSuspend.addListener(async () => {
  if (currentSession) {
    await endSession();
  }
  await syncManager.syncData();
});
