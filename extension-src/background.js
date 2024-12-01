/** @type {number} */
let remainingTime = 0;
/** @type {boolean} */
let isPaused = false;
/** @type {number|null} */
let activeTabId = null;
/** @type {Set<number>} */
let activeRuleIds = new Set();
/** @type {number} */
let lastActiveTime = Date.now();
/** @type {Object} */
let screenTimeData = {
  date: new Date().toISOString().split("T")[0],
  totalTime: 0,
  sites: {},
  focusSessionTime: 0,
};

// Constants
const IDLE_DETECTION_INTERVAL = 60;
const MAX_SITE_TIME = 8 * 60 * 60;
const SYNC_INTERVAL = 5 * 60 * 1000;
const MAX_HISTORY_DAYS = 30;

self.oninstall = (event) => {
  console.log("[ProcrastinationBuster] Service Worker installing...");
  event.waitUntil(self.skipWaiting());
};

self.onactivate = (event) => {
  console.log("[ProcrastinationBuster] Service Worker activating...");
  event.waitUntil(self.clients.claim());
};

chrome.idle.setDetectionInterval(IDLE_DETECTION_INTERVAL);

chrome.idle.onStateChanged.addListener(async (state) => {
  try {
    if (state === "active") {
      lastActiveTime = Date.now();
    } else {
      await updateScreenTime();
      if (!isPaused && remainingTime > 0) {
        await pauseTimer();
      }
    }
  } catch (error) {
    console.error(
      "[ProcrastinationBuster] Error handling idle state change:",
      error
    );
  }
});

/**
 * @param {number} minutes
 */
function createTimerAlarm(minutes) {
  chrome.alarms.create("timer", {
    when: Date.now() + minutes * 60 * 1000,
  });
}

function clearTimerAlarm() {
  chrome.alarms.clear("timer");
}

/**
 * @param {number} minutes
 * @param {boolean} isBreak
 */
async function startTimer(minutes, isBreak = false) {
  try {
    const startTime = Date.now();
    remainingTime = Math.round(minutes * 60);
    isPaused = false;

    console.log("[ProcrastinationBuster] Starting timer:", {
      minutes,
      isBreak,
      startTime,
      remainingTime,
    });

    clearTimerAlarm();
    createTimerAlarm(minutes);

    const sessionData = {
      startTime,
      duration: minutes,
      isBreak,
      isPaused: false,
      remainingTime,
    };

    await chrome.storage.sync.set({
      currentSession: sessionData,
      focusMode: !isBreak,
    });

    if (isBreak) {
      await clearAllBlockingRules();
    } else {
      await updateBlockingRules();
    }

    updateBadge();
    return { success: true, session: sessionData };
  } catch (error) {
    console.error("[ProcrastinationBuster] Error starting timer:", error);
    return { success: false, error: error.message };
  }
}

async function pauseTimer() {
  try {
    isPaused = true;
    clearTimerAlarm();

    const sessionData = await chrome.storage.sync.get(["currentSession"]);
    if (sessionData.currentSession) {
      const elapsed = Math.floor(
        (Date.now() - sessionData.currentSession.startTime) / 1000
      );
      remainingTime = Math.round(
        Math.max(0, sessionData.currentSession.duration * 60 - elapsed)
      );

      await chrome.storage.sync.set({
        currentSession: {
          ...sessionData.currentSession,
          isPaused: true,
          remainingTime,
        },
      });
    }

    await clearAllBlockingRules();
    return { success: true };
  } catch (error) {
    console.error("[ProcrastinationBuster] Error pausing timer:", error);
    return { success: false, error: error.message };
  }
}

async function resumeTimer() {
  try {
    const sessionData = await chrome.storage.sync.get(["currentSession"]);
    if (sessionData.currentSession && sessionData.currentSession.isPaused) {
      isPaused = false;
      const minutes = Math.ceil(remainingTime / 60);

      await chrome.storage.sync.set({
        currentSession: {
          ...sessionData.currentSession,
          startTime: Date.now(),
          duration: minutes,
          isPaused: false,
          remainingTime,
        },
      });

      createTimerAlarm(minutes);

      if (!sessionData.currentSession.isBreak) {
        await updateBlockingRules();
      }
      return { success: true };
    }
    return { success: false, error: "No paused session found" };
  } catch (error) {
    console.error("[ProcrastinationBuster] Error resuming timer:", error);
    return { success: false, error: error.message };
  }
}

// Enhanced site tracking with data validation
function validateTimeData(timeSpent) {
  return Math.min(Math.max(0, timeSpent), MAX_SITE_TIME);
}

async function updateSiteTime() {
  if (!activeTabId) return;

  const now = Date.now();
  const elapsedSeconds = validateTimeData(
    Math.floor((now - lastActiveTime) / 1000)
  );
  lastActiveTime = now;

  try {
    const tab = await chrome.tabs.get(activeTabId);
    if (!tab.url) return;

    const hostname = new URL(tab.url).hostname;
    const { siteStats } = await chrome.storage.sync.get(["siteStats"]);
    const today = new Date().toISOString().split("T")[0];

    if (!siteStats || siteStats.lastUpdate !== today) {
      // Archive old stats before resetting
      if (siteStats) {
        await archiveSiteStats(siteStats);
      }

      await chrome.storage.sync.set({
        siteStats: {
          dailyStats: [],
          lastUpdate: today,
        },
      });
    }

    const stats = siteStats?.dailyStats || [];
    const siteIndex = stats.findIndex((s) => s.domain === hostname);

    if (siteIndex >= 0) {
      stats[siteIndex].timeSpent = validateTimeData(
        stats[siteIndex].timeSpent + elapsedSeconds
      );
      stats[siteIndex].lastVisit = new Date().toISOString();
      stats[siteIndex].visits += 1;
    } else {
      stats.push({
        url: tab.url,
        domain: hostname,
        timeSpent: elapsedSeconds,
        visits: 1,
        lastVisit: new Date().toISOString(),
      });
    }

    await chrome.storage.sync.set({
      siteStats: {
        dailyStats: stats,
        lastUpdate: today,
      },
    });
  } catch (error) {
    console.error("[ProcrastinationBuster] Error updating site time:", error);
  }
}

// Enhanced screen time tracking
async function updateScreenTime() {
  if (!activeTabId) return;

  const now = Date.now();
  try {
    const tab = await chrome.tabs.get(activeTabId);
    const window = await chrome.windows.get(tab.windowId);

    if (!tab.url || !tab.active || !window.focused) {
      lastActiveTime = now;
      return;
    }

    const elapsedSeconds = validateTimeData(
      Math.floor((now - lastActiveTime) / 1000)
    );
    if (elapsedSeconds <= 0) return;

    const hostname = new URL(tab.url).hostname;
    const today = new Date().toISOString().split("T")[0];

    // Reset data if it's a new day
    if (screenTimeData.date !== today) {
      await archiveScreenTimeData();
      screenTimeData = {
        date: today,
        totalTime: 0,
        sites: {},
        focusSessionTime: 0,
      };
    }

    // Update site-specific data
    if (!screenTimeData.sites[hostname]) {
      screenTimeData.sites[hostname] = {
        url: tab.url,
        timeSpent: elapsedSeconds,
        visits: 1,
        lastVisit: now,
        title: tab.title || hostname,
        focusTime: 0,
        distractions: 0,
      };
    } else {
      screenTimeData.sites[hostname].timeSpent = validateTimeData(
        screenTimeData.sites[hostname].timeSpent + elapsedSeconds
      );
      screenTimeData.sites[hostname].visits += 1;
      screenTimeData.sites[hostname].lastVisit = now;
      screenTimeData.sites[hostname].title = tab.title || hostname;
    }

    screenTimeData.totalTime = validateTimeData(
      screenTimeData.totalTime + elapsedSeconds
    );

    // Update focus session time
    const { currentSession } = await chrome.storage.sync.get([
      "currentSession",
    ]);
    if (currentSession && !currentSession.isBreak && !currentSession.isPaused) {
      screenTimeData.focusSessionTime = validateTimeData(
        screenTimeData.focusSessionTime + elapsedSeconds
      );
      screenTimeData.sites[hostname].focusTime = validateTimeData(
        screenTimeData.sites[hostname].focusTime + elapsedSeconds
      );
    }

    await chrome.storage.local.set({
      currentScreenTime: screenTimeData,
      lastActiveTime: now,
    });
  } catch (error) {
    console.error("[ProcrastinationBuster] Error in updateScreenTime:", error);
  }

  lastActiveTime = now;
}

// Data archiving functions
async function archiveScreenTimeData() {
  try {
    const { screenTimeHistory = [] } = await chrome.storage.local.get([
      "screenTimeHistory",
    ]);

    screenTimeHistory.push({
      ...screenTimeData,
      archivedAt: new Date().toISOString(),
    });

    while (screenTimeHistory.length > MAX_HISTORY_DAYS) {
      screenTimeHistory.shift();
    }

    await chrome.storage.local.set({ screenTimeHistory });
  } catch (error) {
    console.error(
      "[ProcrastinationBuster] Error archiving screen time data:",
      error
    );
  }
}

async function archiveSiteStats(stats) {
  try {
    const { siteStatsHistory = [] } = await chrome.storage.local.get([
      "siteStatsHistory",
    ]);

    siteStatsHistory.push({
      ...stats,
      archivedAt: new Date().toISOString(),
    });

    while (siteStatsHistory.length > MAX_HISTORY_DAYS) {
      siteStatsHistory.shift();
    }

    await chrome.storage.local.set({ siteStatsHistory });
  } catch (error) {
    console.error("[ProcrastinationBuster] Error archiving site stats:", error);
  }
}

// Stats retrieval function
async function getScreenTimeStats() {
  try {
    const { currentScreenTime, screenTimeHistory } =
      await chrome.storage.local.get([
        "currentScreenTime",
        "screenTimeHistory",
      ]);

    const stats = {
      today: currentScreenTime || screenTimeData,
      history: screenTimeHistory || [],
      topSites: Object.entries(currentScreenTime?.sites || {})
        .sort(([, a], [, b]) => b.timeSpent - a.timeSpent)
        .slice(0, 5)
        .map(([domain, data]) => ({
          domain,
          ...data,
        })),
    };

    return { success: true, stats };
  } catch (error) {
    console.error(
      "[ProcrastinationBuster] Error getting screen time stats:",
      error
    );
    return { success: false, error: error.message };
  }
}

// Site blocking functions
/**
 * Clears all blocking rules and resets the extension's blocking state
 * @returns {Promise<void>}
 */
async function clearAllBlockingRules() {
  try {
    // Clear dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (existingRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map((rule) => rule.id),
      });
      activeRuleIds.clear();
    }

    // Clear any remaining rules
    const remainingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (remainingRules.length > 0) {
      console.log("Cleaning up remaining rules:", remainingRules);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: remainingRules.map((rule) => rule.id),
      });
    }

    // Disable static rulesets if any exist
    const enabledRulesets =
      await chrome.declarativeNetRequest.getEnabledRulesets();
    if (enabledRulesets.length > 0) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: enabledRulesets,
      });
    }

    // Update storage to reflect cleared state
    await chrome.storage.sync.set({
      activeBlockingRules: [],
      lastRuleClear: Date.now(),
    });

    console.log("Successfully cleared all blocking rules");
    return true;
  } catch (error) {
    console.error("Failed to clear blocking rules:", error);
    // Attempt recovery
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: Array.from(activeRuleIds),
      });
      activeRuleIds.clear();
    } catch (recoveryError) {
      console.error("Recovery attempt failed:", recoveryError);
    }
    return false;
  }
}

/**
 * @returns {Promise<boolean>}
 */
async function updateBlockingRules() {
  try {
    await clearAllBlockingRules();

    const data = await chrome.storage.sync.get([
      "isEnabled",
      "focusMode",
      "blockedSites",
      "currentSession",
    ]);

    const { isEnabled, focusMode, blockedSites, currentSession } = data;

    console.log("Updating blocking rules with state:", {
      isEnabled,
      focusMode,
      blockedSitesCount: blockedSites?.length,
      hasActiveSession: !!currentSession,
    });

    if (
      !isEnabled ||
      !focusMode ||
      !blockedSites?.length ||
      !currentSession ||
      currentSession.isPaused ||
      currentSession.isBreak
    ) {
      console.log("Skipping rule creation - conditions not met");
      return true;
    }

    // Create rules for each blocked site
    const rules = blockedSites.map((site, index) => ({
      id: index + 1000, // Start IDs at 1000 to avoid conflicts
      priority: 1,
      action: {
        type: "redirect",
        redirect: { extensionPath: "/blocked.html" },
      },
      condition: {
        urlFilter: site.replace(/^https?:\/\/(www\.)?/, "*://"),
        resourceTypes: ["main_frame", "sub_frame"],
      },
    }));

    // Apply the new rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from(activeRuleIds),
      addRules: rules,
    });

    // Update active rule tracking
    activeRuleIds = new Set(rules.map((rule) => rule.id));

    // Store current rules in storage for recovery
    await chrome.storage.sync.set({
      activeBlockingRules: Array.from(activeRuleIds),
      lastRuleUpdate: Date.now(),
    });

    console.log(`Successfully created ${rules.length} blocking rules`);
    return true;
  } catch (error) {
    console.error("Failed to update blocking rules:", error);
    // Attempt to clear rules on failure
    await clearAllBlockingRules();
    return false;
  }
}

/**
 * Validates and sanitizes a URL pattern for blocking
 * @param {string} urlPattern The URL pattern to validate
 * @returns {string|null} Sanitized URL pattern or null if invalid
 */
function validateBlockingPattern(urlPattern) {
  try {
    // Remove protocol and www if present
    let sanitized = urlPattern.replace(/^https?:\/\/(www\.)?/, "");

    // Remove trailing slashes
    sanitized = sanitized.replace(/\/+$/, "");

    // Check for valid domain format
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/.test(sanitized)) {
      return null;
    }

    return sanitized;
  } catch (error) {
    console.error("URL pattern validation failed:", error);
    return null;
  }
}

/**
 * Handles cleanup of blocking rules when extension is disabled or suspended
 */
async function handleRuleCleanup() {
  try {
    await clearAllBlockingRules();
    await chrome.storage.sync.remove(["activeBlockingRules", "lastRuleUpdate"]);
    console.log("Cleanup completed successfully");
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

// Add these listeners to ensure proper cleanup
chrome.runtime.onSuspend.addListener(handleRuleCleanup);
chrome.runtime.onUpdateAvailable.addListener(handleRuleCleanup);
