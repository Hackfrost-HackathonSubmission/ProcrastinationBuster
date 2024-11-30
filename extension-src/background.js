// Global variables for timer management
let timer = null;
let remainingTime = 0;

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  // Set default extension state
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
    },
  });

  // Set initial badge state
  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  chrome.action.setBadgeText({ text: "" });
});

// Function to update blocking rules using declarativeNetRequest
async function updateBlockingRules(blockedSites) {
  try {
    // Remove existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: [],
    });

    // If no sites to block or focus mode is off, return
    if (!blockedSites || blockedSites.length === 0) return;

    // Create new rules for each blocked site
    const rules = blockedSites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          url: chrome.runtime.getURL("blocked.html"),
        },
      },
      condition: {
        urlFilter: `||${site}`,
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

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync") {
    // Handle changes to blocked sites
    if (changes.blockedSites) {
      chrome.storage.sync.get(["isEnabled", "focusMode"], (data) => {
        if (data.isEnabled && data.focusMode) {
          updateBlockingRules(changes.blockedSites.newValue);
        }
      });
    }

    // Handle changes to extension state or focus mode
    if (changes.isEnabled || changes.focusMode) {
      chrome.storage.sync.get(
        ["isEnabled", "focusMode", "blockedSites"],
        (data) => {
          if (data.isEnabled && data.focusMode) {
            updateBlockingRules(data.blockedSites);
          } else {
            updateBlockingRules([]);
          }
        }
      );
    }
  }
});

// Timer Management Functions
function startTimer(minutes) {
  remainingTime = minutes * 60;

  // Clear existing timer if any
  if (timer) clearInterval(timer);

  // Save session start time
  chrome.storage.sync.set({
    currentSession: {
      startTime: Date.now(),
      duration: minutes,
    },
  });

  // Update badge text every second
  timer = setInterval(() => {
    remainingTime--;

    // Update badge text with remaining minutes
    chrome.action.setBadgeText({
      text: Math.ceil(remainingTime / 60).toString(),
    });

    // End timer when time is up
    if (remainingTime <= 0) {
      endTimer();
    }
  }, 1000);

  // Set initial badge text
  chrome.action.setBadgeText({
    text: minutes.toString(),
  });
}

function endTimer() {
  // Clear interval and badge
  clearInterval(timer);
  chrome.action.setBadgeText({ text: "" });

  // Show completion notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Focus Session Complete!",
    message: "Great job! Take a break or start another session.",
  });

  // Update stats
  updateStats("focusTime");

  // Clear current session
  chrome.storage.sync.set({ currentSession: null });
}

function pauseTimer() {
  clearInterval(timer);
  timer = null;
}

function resumeTimer() {
  if (remainingTime > 0) {
    startTimer(Math.ceil(remainingTime / 60));
  }
}

// Stats Management
function updateStats(type) {
  chrome.storage.sync.get(["stats"], (data) => {
    const today = new Date().toISOString().split("T")[0];
    const stats = data.stats;

    // Reset stats if it's a new day
    if (stats.lastUpdate.split("T")[0] !== today) {
      stats.dailyFocusTime = 0;
      stats.distractions = 0;
    }

    // Update relevant stat
    if (type === "focusTime") {
      stats.dailyFocusTime += 25; // Add completed session time
    } else if (type === "distractions") {
      stats.distractions += 1;
    }

    // Update last update timestamp
    stats.lastUpdate = new Date().toISOString();

    // Save updated stats
    chrome.storage.sync.set({ stats });
  });
}

// URL Monitoring
function checkUrl(url) {
  chrome.storage.sync.get(
    ["isEnabled", "focusMode", "blockedSites"],
    (data) => {
      if (!data.isEnabled || !data.focusMode) return;

      try {
        const hostname = new URL(url).hostname.replace("www.", "");
        if (data.blockedSites.some((site) => hostname.includes(site))) {
          updateStats("distractions");
        }
      } catch (error) {
        console.error("Error checking URL:", error);
      }
    }
  );
}

// Tab Monitoring
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) checkUrl(tab.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) checkUrl(changeInfo.url);
});

// Message Handling from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startTimer":
      startTimer(request.minutes);
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
      sendResponse({ remainingTime });
      break;
  }
  return true; // Required for async response
});

// Alarm handling for periodic checks
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkSession") {
    chrome.storage.sync.get(["currentSession"], (data) => {
      if (data.currentSession) {
        const { startTime, duration } = data.currentSession;
        const elapsed = (Date.now() - startTime) / 1000 / 60; // Convert to minutes
        if (elapsed >= duration) {
          endTimer();
        }
      }
    });
  }
});

// Create alarm for periodic session checks
chrome.alarms.create("checkSession", {
  periodInMinutes: 1,
});
