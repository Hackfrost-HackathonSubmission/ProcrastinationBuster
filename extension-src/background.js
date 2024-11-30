// Global variables for timer management
let timer = null;
let remainingTime = 0;

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
function startTimer(minutes, isBreak = false) {
  remainingTime = minutes * 60;

  // Create an alarm for when the timer should end
  createTimerAlarm(minutes);

  // Store timer state
  chrome.storage.sync.set({
    currentSession: {
      startTime: Date.now(),
      duration: minutes,
      isBreak: isBreak,
    },
  });

  // Enable focus mode if it's not a break
  if (!isBreak) {
    chrome.storage.sync.set({ focusMode: true }, updateBlockingRules);
  }

  // Update badge
  updateBadge();
}

// Update badge every minute
function updateBadge() {
  chrome.storage.sync.get(["currentSession"], (data) => {
    if (data.currentSession) {
      const { startTime, duration } = data.currentSession;
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, duration * 60 - elapsed);

      chrome.action.setBadgeText({
        text: Math.ceil(remaining / 60).toString(),
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

  // First, explicitly clear all blocking rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRules.map((rule) => rule.id),
  });

  chrome.storage.sync.get(["currentSession"], (data) => {
    if (data.currentSession && !data.currentSession.isBreak) {
      // Update stats
      chrome.storage.sync.get(["stats"], (data) => {
        const stats = data.stats || {};
        stats.dailyFocusTime += data.currentSession.duration;
        chrome.storage.sync.set({ stats });
      });
    }
  });

  // Clear session and focus mode
  await chrome.storage.sync.set({
    currentSession: null,
    focusMode: false,
    // Also explicitly clear blocked sites when timer ends
    blockedSites: [],
  });

  // Update UI
  chrome.action.setBadgeText({ text: "" });

  // Show notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Timer Complete!",
    message: "Great job! Take a break or start another session.",
  });
}

// Site blocking
async function updateBlockingRules() {
  try {
    const data = await chrome.storage.sync.get([
      "isEnabled",
      "focusMode",
      "blockedSites",
    ]);
    const { isEnabled, focusMode, blockedSites } = data;

    // Remove existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRules.map((rule) => rule.id),
    });

    // Add new rules if enabled and in focus mode
    if (isEnabled && focusMode && blockedSites?.length) {
      const rules = blockedSites.map((site, index) => ({
        id: index + 1,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/blocked.html" },
        },
        condition: {
          urlFilter: "*://*." + site.replace(/^https?:\/\/(www\.)?/, ""),
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

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startTimer":
      startTimer(request.minutes, request.isBreak);
      sendResponse({ success: true });
      break;
    case "endTimer":
      endTimer();
      sendResponse({ success: true });
      break;
    case "getTimeRemaining":
      chrome.storage.sync.get(["currentSession"], (data) => {
        if (data.currentSession) {
          const { startTime, duration } = data.currentSession;
          const elapsed = (Date.now() - startTime) / 1000;
          const remaining = Math.max(0, duration * 60 - elapsed);
          sendResponse({
            remainingTime: remaining,
            isRunning: true,
          });
        } else {
          sendResponse({
            remainingTime: 0,
            isRunning: false,
          });
        }
      });
      return true;
  }
});

// Listen for storage changes to update blocking rules
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (
    namespace === "sync" &&
    (changes.focusMode || changes.blockedSites || changes.isEnabled)
  ) {
    updateBlockingRules();
  }
});
