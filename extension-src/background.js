// Global variables for timer management
let timer = null;
let remainingTime = 0;

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  // Set default extension state
  chrome.storage.local.set({
    isEnabled: true,
    focusMode: false,
    focusTimer: 25,
    breakTimer: 5,
    timerState: {
      isRunning: false,
      remainingTime: 0,
      startTime: null,
      totalDuration: 0,
      isBreak: false,
    },
    blockedSites: [],
    stats: {
      dailyFocusTime: 0,
      distractions: 0,
      lastUpdate: new Date().toISOString(),
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

// Function to update blocking rules
async function updateBlockingRules(isEnabled = true) {
  try {
    const { blockedSites, focusMode } = await chrome.storage.local.get([
      "blockedSites",
      "focusMode",
    ]);

    // Remove existing rules first
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: [],
    });

    // Only add rules if extension is enabled and in focus mode
    if (!isEnabled || !focusMode || !blockedSites?.length) {
      return;
    }

    // Create new rules for each blocked site
    const rules = blockedSites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          extensionPath: "/blocked.html",
        },
      },
      condition: {
        urlFilter: site.replace(/^www\./, ""),
        resourceTypes: ["main_frame"],
      },
    }));

    // Add new rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
    });
  } catch (error) {
    console.error("Error updating blocking rules:", error);
  }
}

// Function to persist timer state
async function persistTimerState(isRunning, duration = 0, isBreak = false) {
  const currentTime = Date.now();
  await chrome.storage.local.set({
    timerState: {
      isRunning,
      remainingTime,
      startTime: currentTime,
      totalDuration: duration * 60,
      isBreak,
    },
  });

  // Update blocking rules based on timer state
  if (isRunning && !isBreak) {
    await chrome.storage.local.set({ focusMode: true });
    await updateBlockingRules(true);
  } else if (!isRunning) {
    await chrome.storage.local.set({ focusMode: false });
    await updateBlockingRules(false);
  }
}

// Function to restore timer state
async function restoreTimerState() {
  const data = await chrome.storage.local.get("timerState");
  if (data.timerState && data.timerState.isRunning) {
    const { startTime, totalDuration, isBreak } = data.timerState;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, totalDuration - elapsedSeconds);

    if (remaining > 0) {
      // Resume timer with remaining time
      startTimer(Math.ceil(remaining / 60), isBreak);
    } else {
      // Timer should have ended
      endTimer();
    }
  }
}

function startTimer(minutes, isBreak = false) {
  remainingTime = minutes * 60;

  // Clear existing timer if any
  if (timer) clearInterval(timer);

  // Persist timer state
  persistTimerState(true, minutes, isBreak);

  // Update badge text every second
  timer = setInterval(() => {
    remainingTime--;

    // Update badge text with remaining minutes
    chrome.action.setBadgeText({
      text: Math.ceil(remainingTime / 60).toString(),
    });

    // Update badge color based on session type
    chrome.action.setBadgeBackgroundColor({
      color: isBreak ? "#4CAF50" : "#2196F3",
    });

    // Persist remaining time
    persistTimerState(true, Math.ceil(remainingTime / 60), isBreak);

    if (remainingTime <= 0) {
      endTimer(isBreak);
    }
  }, 1000);

  // Set initial badge text and color
  chrome.action.setBadgeText({
    text: minutes.toString(),
  });
  chrome.action.setBadgeBackgroundColor({
    color: isBreak ? "#4CAF50" : "#2196F3",
  });
}

function endTimer(wasBreak = false) {
  clearInterval(timer);
  timer = null;
  remainingTime = 0;

  // Clear timer state and disable focus mode
  persistTimerState(false, 0, false);

  chrome.action.setBadgeText({ text: "" });

  // Only update stats and show notification if it wasn't a break
  if (!wasBreak) {
    updateStats("focusTime");
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Focus Session Complete!",
      message: "Great job! Take a break or start another session.",
    });
  }
}

function pauseTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    persistTimerState(false);
  }
}

function resumeTimer() {
  if (remainingTime > 0) {
    chrome.storage.local.get("timerState", (data) => {
      startTimer(
        Math.ceil(remainingTime / 60),
        data.timerState?.isBreak || false
      );
    });
  }
}

// Message handling from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startTimer":
      startTimer(request.minutes, request.isBreak || false);
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
      endTimer(request.isBreak || false);
      sendResponse({ success: true });
      break;
    case "getTimeRemaining":
      chrome.storage.local.get("timerState", (data) => {
        if (data.timerState && data.timerState.isRunning) {
          const { startTime, totalDuration } = data.timerState;
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, totalDuration - elapsedSeconds);
          sendResponse({
            remainingTime: remaining,
            totalDuration: totalDuration,
            isBreak: data.timerState.isBreak,
          });
        } else {
          sendResponse({ remainingTime: 0, totalDuration: 0, isBreak: false });
        }
      });
      return true;
  }
});

// URL blocking and monitoring
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    checkUrl(changeInfo.url, tabId);
  }
});

async function checkUrl(url, tabId) {
  const { isEnabled, focusMode, blockedSites } = await chrome.storage.local.get(
    ["isEnabled", "focusMode", "blockedSites"]
  );

  if (!isEnabled || !focusMode || !blockedSites?.length) return;

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (
      blockedSites.some((site) => hostname.includes(site.replace(/^www\./, "")))
    ) {
      updateStats("distractions");
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
    }
  } catch (error) {
    console.error("Error checking URL:", error);
  }
}

// Stats management
function updateStats(type) {
  chrome.storage.local.get(["stats"], (data) => {
    const today = new Date().toISOString().split("T")[0];
    const stats = data.stats || {};

    // Reset stats if it's a new day
    if (stats.lastUpdate?.split("T")[0] !== today) {
      stats.dailyFocusTime = 0;
      stats.distractions = 0;

      // Update streak
      if (stats.dailyFocusTime > 0) {
        stats.streak = stats.streak || { current: 0, best: 0 };
        stats.streak.current += 1;
        stats.streak.best = Math.max(stats.streak.current, stats.streak.best);
      } else {
        stats.streak.current = 0;
      }
    }

    // Update relevant stat
    if (type === "focusTime") {
      stats.dailyFocusTime = (stats.dailyFocusTime || 0) + 25;
    } else if (type === "distractions") {
      stats.distractions = (stats.distractions || 0) + 1;
    }

    stats.lastUpdate = new Date().toISOString();
    chrome.storage.local.set({ stats });
  });
}

// Initialize alarms
chrome.alarms.create("checkTimerState", { periodInMinutes: 1 });

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkTimerState") {
    restoreTimerState();
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && (changes.focusMode || changes.blockedSites)) {
    updateBlockingRules();
  }
});
