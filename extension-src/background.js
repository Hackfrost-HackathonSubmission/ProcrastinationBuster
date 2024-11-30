// Global variables
let remainingTime = 0;
let isPaused = false;
let activeTabId = null;
let activeRuleIds = new Set();
let lastActiveTime = Date.now();
let screenTimeData = {
  date: new Date().toISOString().split("T")[0],
  totalTime: 0,
  sites: {},
  focusSessionTime: 0,
};

// Service Worker setup
self.oninstall = (event) => {
  console.log("Service Worker installing...");
};

self.onactivate = (event) => {
  console.log("Service Worker activating...");
};

// Timer functions
function createTimerAlarm(minutes) {
  chrome.alarms.create("timer", {
    when: Date.now() + minutes * 60 * 1000,
  });
}

function clearTimerAlarm() {
  chrome.alarms.clear("timer");
}

async function startTimer(minutes, isBreak = false) {
  const startTime = Date.now();
  remainingTime = Math.round(minutes * 60);
  isPaused = false;

  console.log("Starting timer:", {
    minutes,
    isBreak,
    startTime,
    remainingTime,
  });

  createTimerAlarm(minutes);

  await chrome.storage.sync.set({
    currentSession: {
      startTime,
      duration: minutes,
      isBreak,
      isPaused: false,
      remainingTime,
    },
  });

  if (isBreak) {
    await chrome.storage.sync.set({ focusMode: false });
    await clearAllBlockingRules();
  } else {
    await chrome.storage.sync.set({ focusMode: true });
    await updateBlockingRules();
  }

  updateBadge();
}

async function pauseTimer() {
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
}

async function resumeTimer() {
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
  }
}

// Site tracking
async function updateSiteTime() {
  if (!activeTabId) return;

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastActiveTime) / 1000);
  lastActiveTime = now;

  try {
    const tab = await chrome.tabs.get(activeTabId);
    if (!tab.url) return;

    const hostname = new URL(tab.url).hostname;
    const { siteStats } = await chrome.storage.sync.get(["siteStats"]);
    const today = new Date().toISOString().split("T")[0];

    if (!siteStats || siteStats.lastUpdate !== today) {
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
      stats[siteIndex].timeSpent += elapsedSeconds;
      stats[siteIndex].lastVisit = new Date().toISOString();
    } else {
      stats.push({
        url: tab.url,
        domain: hostname,
        timeSpent: elapsedSeconds,
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
    console.error("Error updating site time:", error);
  }
}

// Enhanced screen time tracking functions
async function updateScreenTime() {
  if (!activeTabId) return;

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastActiveTime) / 1000);

  try {
    const tab = await chrome.tabs.get(activeTabId);
    if (!tab.url) return;

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
      screenTimeData.sites[hostname].timeSpent += elapsedSeconds;
      screenTimeData.sites[hostname].visits += 1;
      screenTimeData.sites[hostname].lastVisit = now;
      screenTimeData.sites[hostname].title = tab.title || hostname;
    }

    screenTimeData.totalTime += elapsedSeconds;

    // Check if in focus session
    const { currentSession } = await chrome.storage.sync.get([
      "currentSession",
    ]);
    if (currentSession && !currentSession.isBreak && !currentSession.isPaused) {
      screenTimeData.focusSessionTime += elapsedSeconds;
      screenTimeData.sites[hostname].focusTime += elapsedSeconds;
    }

    // Save updated data
    await chrome.storage.local.set({ currentScreenTime: screenTimeData });
  } catch (error) {
    console.error("Error in updateScreenTime:", error);
  }

  lastActiveTime = now;
}

async function archiveScreenTimeData() {
  try {
    const { screenTimeHistory } = await chrome.storage.local.get([
      "screenTimeHistory",
    ]);
    const history = screenTimeHistory || [];

    history.push({
      ...screenTimeData,
      archivedAt: new Date().toISOString(),
    });

    // Keep last 30 days of history
    while (history.length > 30) {
      history.shift();
    }

    await chrome.storage.local.set({ screenTimeHistory: history });
  } catch (error) {
    console.error("Error archiving screen time data:", error);
  }
}

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

    return stats;
  } catch (error) {
    console.error("Error getting screen time stats:", error);
    return null;
  }
}

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
      console.error("Rules still exist after clearing:", remainingRules);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: remainingRules.map((rule) => rule.id),
      });
    }

    // Disable static rulesets
    const enabledRulesets =
      await chrome.declarativeNetRequest.getEnabledRulesets();
    if (enabledRulesets.length > 0) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: enabledRulesets,
      });
    }
    console.log("All blocking rules cleared successfully");
  } catch (error) {
    console.error("Error clearing blocking rules:", error);
  }
}

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

    console.log("Updating blocking rules:", {
      isEnabled,
      focusMode,
      blockedSites,
      currentSession,
    });

    if (
      !isEnabled ||
      !focusMode ||
      !blockedSites?.length ||
      !currentSession ||
      currentSession.isPaused ||
      currentSession.isBreak
    ) {
      console.log("Not creating blocking rules due to conditions not met");
      await clearAllBlockingRules();
      return;
    }

    const rules = blockedSites.map((site, index) => ({
      id: index + 1000,
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

    console.log("Adding blocking rules:", rules);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from(activeRuleIds),
      addRules: rules,
    });

    activeRuleIds = new Set(rules.map((rule) => rule.id));
    console.log("Rules updated successfully");
  } catch (error) {
    console.error("Error updating blocking rules:", error);
    await clearAllBlockingRules();
  }
}

function updateBadge() {
  chrome.storage.sync.get(["currentSession"], (data) => {
    if (data.currentSession) {
      const { startTime, duration, isPaused, remainingTime } =
        data.currentSession;
      let remaining;

      if (isPaused) {
        remaining = Math.round(remainingTime);
      } else {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        remaining = Math.round(Math.max(0, duration * 60 - elapsed));
      }

      const text = `${Math.floor(remaining / 60)}:${Math.floor(remaining % 60)
        .toString()
        .padStart(2, "0")}`;
      chrome.action.setBadgeText({ text });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  });
}

async function endTimer() {
  clearTimerAlarm();

  try {
    console.log("Timer ending, clearing all blocking rules");
    await clearAllBlockingRules();

    const sessionData = await chrome.storage.sync.get(["currentSession"]);
    if (sessionData.currentSession && !sessionData.currentSession.isBreak) {
      const statsData = await chrome.storage.sync.get(["stats"]);
      const stats = statsData.stats || {};
      stats.dailyFocusTime += sessionData.currentSession.duration;
      await chrome.storage.sync.set({ stats });
    }

    await chrome.storage.sync.set({
      currentSession: null,
      focusMode: false,
    });

    await chrome.action.setBadgeText({ text: "" });
    await clearAllBlockingRules();

    chrome.notifications.create({
      type: "basic",
      iconUrl: "/icon48.png",
      title: "Timer Complete!",
      message: "Great job! Take a break or start another session.",
      silent: true,
    });
  } catch (error) {
    console.error("Error in endTimer:", error);
    await clearAllBlockingRules();
  }
}

// Event Listeners
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (activeTabId) {
    await updateSiteTime();
  }
  activeTabId = activeInfo.tabId;
  lastActiveTime = Date.now();
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    if (activeTabId) {
      await updateSiteTime();
      activeTabId = null;
    }
  } else {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    activeTabId = tab?.id;
    lastActiveTime = Date.now();
  }
});

// Enhanced Event Listeners
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (activeTabId) {
    await updateScreenTime();
    await updateSiteTime(); // Keep your existing functionality
  }
  activeTabId = activeInfo.tabId;
  lastActiveTime = Date.now();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tabId === activeTabId) {
    lastActiveTime = Date.now();
    await updateScreenTime();
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    if (activeTabId) {
      await updateScreenTime();
      await updateSiteTime();
      activeTabId = null;
    }
  } else {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    activeTabId = tab?.id;
    lastActiveTime = Date.now();
  }
});

// Initialize extension
async function initializeRules() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRules.map((rule) => rule.id),
    });

    if (
      (await chrome.declarativeNetRequest.getAvailableStaticRuleCount()) > 0
    ) {
      const enabledRulesets =
        await chrome.declarativeNetRequest.getEnabledRulesets();
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: enabledRulesets,
      });
    }
  } catch (error) {
    console.error("Error initializing rules:", error);
  }
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startTimer":
      startTimer(request.minutes, request.isBreak);
      sendResponse({ success: true });
      break;
    case "pauseTimer":
      pauseTimer();
      sendResponse({ success: true });
      break;
    case "resumeTimer":
      resumeTimer();
      sendResponse({ success: true });
      break;
    case "endTimer":
      endTimer();
      sendResponse({ success: true });
      break;
    case "getTimeRemaining":
      chrome.storage.sync.get(["currentSession"], (data) => {
        if (data.currentSession) {
          const { startTime, duration, isPaused, remainingTime } =
            data.currentSession;
          let remaining;

          if (isPaused) {
            remaining = remainingTime;
          } else {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            remaining = Math.max(0, duration * 60 - elapsed);
          }

          sendResponse({
            remainingTime: remaining,
            isRunning: !isPaused,
            totalDuration: duration * 60,
          });
        } else {
          sendResponse({
            remainingTime: 0,
            isRunning: false,
            totalDuration: 0,
          });
        }
      });
    case "getScreenTimeStats":
      getScreenTimeStats()
        .then((stats) => sendResponse({ success: true, stats }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
      return true;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  await initializeRules();
  chrome.storage.sync.set({
    isEnabled: true,
    focusMode: false,
    focusTimer: 25,
    breakTimer: 5,
    currentSession: null,
    blockedSites: [],
    stats: {
      dailyFocusTime: 0,
      distractions: 0,
      lastUpdate: new Date().toISOString(),
      focusSessions: [],
      streak: {
        current: 0,
        best: 0,
        lastDate: new Date().toISOString(),
      },
    },
  });

  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  chrome.action.setBadgeText({ text: "" });
});

// Cleanup handlers
chrome.runtime.onSuspend.addListener(async () => {
  await clearAllBlockingRules();
});

chrome.runtime.onUpdateAvailable.addListener(async () => {
  await clearAllBlockingRules();
});
