// Global variables for timer management
let timer = null;
let remainingTime = 0;
let isPaused = false;

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
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

  // Set initial badge state
  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  chrome.action.setBadgeText({ text: "" });
});

// Clear all blocking rules function
async function clearAllBlockingRules() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (existingRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map((rule) => rule.id),
      });
    }
  } catch (error) {
    console.error("Error clearing blocking rules:", error);
  }
}

// Format time for display
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = Math.floor(seconds % 60);
  return `${minutes}:${remainingSecs.toString().padStart(2, "0")}`;
}

// Timer Alarm Management
function createTimerAlarm(minutes) {
  chrome.alarms.create("timer", {
    when: Date.now() + minutes * 60 * 1000,
  });
}

function clearTimerAlarm() {
  chrome.alarms.clear("timer");
}

// Start timer
async function startTimer(minutes, isBreak = false) {
  remainingTime = minutes * 60;
  isPaused = false;

  // Create an alarm for when the timer should end
  createTimerAlarm(minutes);

  // Store timer state
  await chrome.storage.sync.set({
    currentSession: {
      startTime: Date.now(),
      duration: minutes,
      isBreak: isBreak,
      isPaused: false,
    },
  });

  // Update blocking rules based on session type
  if (!isBreak) {
    await chrome.storage.sync.set({ focusMode: true });
  } else {
    await chrome.storage.sync.set({ focusMode: false });
    await clearAllBlockingRules();
  }

  // Update badge
  updateBadge();
}

// Pause timer
async function pauseTimer() {
  isPaused = true;
  clearTimerAlarm();

  const data = await chrome.storage.sync.get(["currentSession"]);
  if (data.currentSession) {
    const elapsed = (Date.now() - data.currentSession.startTime) / 1000;
    remainingTime = Math.max(0, data.currentSession.duration * 60 - elapsed);

    await chrome.storage.sync.set({
      currentSession: {
        ...data.currentSession,
        isPaused: true,
        remainingTime: remainingTime,
      },
    });
  }

  // Clear blocking rules when paused
  await clearAllBlockingRules();
}

// Resume timer
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
      },
    });

    createTimerAlarm(minutes);

    // Reapply blocking rules if it's a focus session
    if (!data.currentSession.isBreak) {
      await updateBlockingRules();
    }
  }
}

// Update badge every minute
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
        timeToDisplay = storedRemaining;
      } else {
        const elapsed = (Date.now() - startTime) / 1000;
        timeToDisplay = Math.max(0, duration * 60 - elapsed);
      }

      chrome.action.setBadgeText({
        text: formatTime(timeToDisplay),
      });
    }
  });
}

// Create an alarm to update badge
chrome.alarms.create("updateBadge", { periodInMinutes: 1 });

// Handle alarms
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
    // Clear all blocking rules
    await clearAllBlockingRules();

    // Update stats if needed
    const sessionData = await chrome.storage.sync.get(["currentSession"]);
    if (sessionData.currentSession && !sessionData.currentSession.isBreak) {
      const statsData = await chrome.storage.sync.get(["stats"]);
      const stats = statsData.stats || {};
      stats.dailyFocusTime += sessionData.currentSession.duration;
      await chrome.storage.sync.set({ stats });
    }

    // Clear session and focus mode
    await chrome.storage.sync.set({
      currentSession: null,
      focusMode: false,
    });

    // Update UI
    await chrome.action.setBadgeText({ text: "" });

    // Show notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "/icons/icon48.png", // Make sure this path matches your extension's icon path
      title: "Timer Complete!",
      message: "Great job! Take a break or start another session.",
      silent: true,
    });
  } catch (error) {
    console.error("Error in endTimer:", error);
  }
}

async function updateBlockingRules() {
  try {
    // First, clear all existing rules
    await clearAllBlockingRules();

    const data = await chrome.storage.sync.get([
      "isEnabled",
      "focusMode",
      "blockedSites",
      "currentSession",
    ]);

    const { isEnabled, focusMode, blockedSites, currentSession } = data;

    // Only add rules if:
    // 1. Extension is enabled
    // 2. Focus mode is active
    // 3. There are blocked sites
    // 4. There is an active session
    // 5. The session is not paused
    // 6. The session is not a break
    if (
      isEnabled &&
      focusMode &&
      blockedSites?.length &&
      currentSession &&
      !currentSession.isPaused &&
      !currentSession.isBreak
    ) {
      const rules = blockedSites.map((site, index) => ({
        id: index + 1,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/blocked.html" },
        },
        condition: {
          urlFilter: `*://*${site.replace(/^https?:\/\/(www\.)?/, "")}/*`,
          resourceTypes: ["main_frame"],
        },
      }));

      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules,
      });
    }
  } catch (error) {
    console.error("Error updating blocking rules:", error);
  }
}

// Handle extension cleanup
chrome.runtime.onSuspend.addListener(() => {
  clearAllBlockingRules();
});

// Message handler
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
            remaining = storedRemaining;
          } else {
            const elapsed = (Date.now() - startTime) / 1000;
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
      return true;
  }
});

// Listen for storage changes to update blocking rules
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync") {
    if (
      changes.currentSession ||
      changes.focusMode ||
      changes.blockedSites ||
      changes.isEnabled
    ) {
      updateBlockingRules();
    }
  }
});
