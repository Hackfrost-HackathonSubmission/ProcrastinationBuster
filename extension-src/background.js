let timer = null;
let remainingTime = 0;
let isPaused = false;
let activeRuleIds = new Set();

// Initialize rules function
async function initializeRules() {
  try {
    // Clear any existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRules.map((rule) => rule.id),
    });

    // Disable static rules
    const staticRuleSets =
      await chrome.declarativeNetRequest.getAvailableStaticRuleCount();
    if (staticRuleSets > 0) {
      const rulesetIds =
        await chrome.declarativeNetRequest.getEnabledRulesets();
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: rulesetIds,
      });
    }
  } catch (error) {
    console.error("Error initializing rules:", error);
  }
}

// Initialize extension on install
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

// Clear rules on startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeRules();
});

// Add cleanup handlers for extension unload/update
chrome.runtime.onSuspend.addListener(async () => {
  await clearAllBlockingRules();
});

chrome.runtime.onUpdateAvailable.addListener(async () => {
  await clearAllBlockingRules();
});

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

    // Double check dynamic rules are cleared
    const remainingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (remainingRules.length > 0) {
      console.error("Rules still exist after clearing:", remainingRules);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: remainingRules.map((rule) => rule.id),
      });
    }

    // Make sure static rules are disabled
    const rulesetIds = await chrome.declarativeNetRequest.getEnabledRulesets();
    if (rulesetIds.length > 0) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: rulesetIds,
      });
    }

    console.log("All blocking rules cleared successfully");
  } catch (error) {
    console.error("Error clearing blocking rules:", error);
  }
}

function formatTime(seconds) {
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSecs = Math.floor(totalSeconds % 60);
  return `${minutes}:${remainingSecs.toString().padStart(2, "0")}`;
}

function createTimerAlarm(minutes) {
  chrome.alarms.create("timer", {
    when: Date.now() + minutes * 60 * 1000,
  });
}

function clearTimerAlarm() {
  chrome.alarms.clear("timer");
}

async function startTimer(minutes, isBreak = false) {
  remainingTime = Math.round(minutes * 60);
  isPaused = false;

  createTimerAlarm(minutes);

  await chrome.storage.sync.set({
    currentSession: {
      startTime: Date.now(),
      duration: minutes,
      isBreak: isBreak,
      isPaused: false,
      remainingTime: remainingTime,
    },
  });

  if (!isBreak) {
    await chrome.storage.sync.set({ focusMode: true });
    await updateBlockingRules();
  } else {
    await chrome.storage.sync.set({ focusMode: false });
    await clearAllBlockingRules();
  }

  updateBadge();
}

async function pauseTimer() {
  isPaused = true;
  clearTimerAlarm();

  const data = await chrome.storage.sync.get(["currentSession"]);
  if (data.currentSession) {
    const elapsed = Math.floor(
      (Date.now() - data.currentSession.startTime) / 1000
    );
    remainingTime = Math.round(
      Math.max(0, data.currentSession.duration * 60 - elapsed)
    );

    await chrome.storage.sync.set({
      currentSession: {
        ...data.currentSession,
        isPaused: true,
        remainingTime: remainingTime,
      },
    });
  }

  await clearAllBlockingRules();
}

async function resumeTimer() {
  const data = await chrome.storage.sync.get(["currentSession"]);
  if (data.currentSession && data.currentSession.isPaused) {
    isPaused = false;
    const minutes = Math.ceil(remainingTime / 60);

    await chrome.storage.sync.set({
      currentSession: {
        ...data.currentSession,
        startTime: Date.now(),
        duration: minutes,
        isPaused: false,
        remainingTime: remainingTime,
      },
    });

    createTimerAlarm(minutes);

    if (!data.currentSession.isBreak) {
      await updateBlockingRules();
    }
  }
}

function updateBadge() {
  chrome.storage.sync.get(["currentSession"], (data) => {
    if (data.currentSession) {
      const {
        startTime,
        duration,
        isPaused,
        remainingTime: storedRemaining,
      } = data.currentSession;
      let timeToDisplay;

      if (isPaused) {
        timeToDisplay = Math.round(storedRemaining);
      } else {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timeToDisplay = Math.round(Math.max(0, duration * 60 - elapsed));
      }

      const minutes = Math.floor(timeToDisplay / 60);
      const seconds = Math.floor(timeToDisplay % 60);
      const displayText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      chrome.action.setBadgeText({ text: displayText });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  });
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

    console.log("Current state:", {
      isEnabled,
      focusMode,
      hasBlockedSites: blockedSites?.length > 0,
      hasCurrentSession: !!currentSession,
      isPaused: currentSession?.isPaused,
      isBreak: currentSession?.isBreak,
    });

    if (
      !isEnabled ||
      !focusMode ||
      !blockedSites?.length ||
      !currentSession ||
      currentSession.isPaused ||
      currentSession.isBreak
    ) {
      console.log("Conditions not met for blocking, clearing rules");
      await clearAllBlockingRules();
      return;
    }

    const rules = blockedSites.map((site, index) => {
      // Remove protocol and www if present
      const cleanedSite = site.replace(/^https?:\/\/(www\.)?/, "");

      return {
        id: index + 1000,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/blocked.html" },
        },
        condition: {
          urlFilter: `*://*${cleanedSite}/*`, // Updated URL filtering pattern
          resourceTypes: ["main_frame"],
        },
      };
    });

    activeRuleIds = new Set(rules.map((rule) => rule.id));
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: (
        await chrome.declarativeNetRequest.getDynamicRules()
      ).map((rule) => rule.id),
      addRules: rules,
    });
    console.log("Blocking rules updated successfully:", rules);
  } catch (error) {
    console.error("Error updating blocking rules:", error);
    await clearAllBlockingRules();
  }
}

chrome.alarms.create("updateBadge", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "timer") {
    endTimer();
  } else if (alarm.name === "updateBadge") {
    updateBadge();
  }
});

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
      iconUrl: "/icons/icon48.png",
      title: "Timer Complete!",
      message: "Great job! Take a break or start another session.",
      silent: true,
    });
  } catch (error) {
    console.error("Error in endTimer:", error);
    await clearAllBlockingRules();
  }
}

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
          const {
            startTime,
            duration,
            isPaused,
            remainingTime: storedRemaining,
          } = data.currentSession;
          let remaining;

          if (isPaused) {
            remaining = Math.round(storedRemaining);
          } else {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            remaining = Math.round(Math.max(0, duration * 60 - elapsed));
          }

          sendResponse({
            remainingTime: remaining,
            isRunning: !isPaused,
            totalDuration: Math.round(duration * 60),
          });
        } else {
          sendResponse({
            remainingTime: 0,
            isRunning: false,
            totalDuration: 0,
          });
        }
      });
      return true;
  }
});

chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === "sync") {
    console.log("Storage changes detected:", changes);

    if (changes.focusMode) {
      if (!changes.focusMode.newValue) {
        console.log("Focus mode disabled, clearing rules");
        await clearAllBlockingRules();
      }
    }

    if (changes.blockedSites) {
      if (
        !changes.blockedSites.newValue ||
        changes.blockedSites.newValue.length === 0
      ) {
        console.log("Blocked sites cleared or empty, clearing rules");
        await clearAllBlockingRules();
      }
    }

    if (changes.currentSession) {
      if (!changes.currentSession.newValue) {
        console.log("Session ended, clearing rules");
        await clearAllBlockingRules();
      }
    }

    if (
      changes.currentSession ||
      changes.focusMode ||
      changes.blockedSites ||
      changes.isEnabled
    ) {
      await updateBlockingRules();
    }
  }
});

// Cleanup handlers for extension unload/update
chrome.runtime.onSuspend.addListener(async () => {
  console.log("Extension being suspended, clearing rules");
  await clearAllBlockingRules();
});

chrome.runtime.onUpdateAvailable.addListener(async () => {
  console.log("Extension update available, clearing rules");
  await clearAllBlockingRules();
});

// Handle extension uninstall
chrome.runtime.setUninstallURL("https://forms.gle/feedback", () => {
  clearAllBlockingRules();
});

// Handle extension reload
chrome.runtime.onRestartRequired.addListener(async () => {
  console.log("Extension restart required, clearing rules");
  await clearAllBlockingRules();
});

// Make sure rules are cleared when extension is disabled
chrome.management.onDisabled.addListener(async (info) => {
  if (info.id === chrome.runtime.id) {
    console.log("Extension being disabled, clearing rules");
    await clearAllBlockingRules();
  }
});

// Initialize rules when extension loads
initializeRules()
  .then(() => {
    console.log("Rules initialized successfully");
  })
  .catch((error) => {
    console.error("Error initializing rules:", error);
  });
