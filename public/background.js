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
    },
  });
});

// Track active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) checkUrl(tab.url);
  });
});

// Track URL changes in active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) checkUrl(changeInfo.url);
});

function checkUrl(url) {
  chrome.storage.sync.get(
    ["isEnabled", "focusMode", "blockedSites"],
    (data) => {
      if (!data.isEnabled || !data.focusMode) return;

      const hostname = new URL(url).hostname;
      if (data.blockedSites.includes(hostname)) {
        // Block access to distracting site
        chrome.tabs.update({
          url: chrome.runtime.getURL("blocked.html"),
        });

        // Record distraction attempt
        updateStats("distractions");
      }
    }
  );
}

function startTimer(minutes) {
  remainingTime = minutes * 60;

  if (timer) clearInterval(timer);

  chrome.storage.sync.set({
    currentSession: {
      startTime: Date.now(),
      duration: minutes,
    },
  });

  timer = setInterval(() => {
    remainingTime--;

    // Update badge with remaining time
    chrome.action.setBadgeText({
      text: Math.ceil(remainingTime / 60).toString(),
    });

    if (remainingTime <= 0) {
      endTimer();
    }
  }, 1000);
}

function endTimer() {
  clearInterval(timer);
  chrome.action.setBadgeText({ text: "" });

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Focus Session Complete!",
    message: "Great job! Take a break or start another session.",
  });

  updateStats("focusTime");
}

function updateStats(type) {
  chrome.storage.sync.get(["stats"], (data) => {
    const today = new Date().toISOString().split("T")[0];
    const stats = data.stats;

    if (stats.lastUpdate.split("T")[0] !== today) {
      // Reset daily stats
      stats.dailyFocusTime = 0;
      stats.distractions = 0;
    }

    if (type === "focusTime") {
      stats.dailyFocusTime += 25; // Add completed session time
    } else if (type === "distractions") {
      stats.distractions += 1;
    }

    stats.lastUpdate = new Date().toISOString();

    chrome.storage.sync.set({ stats });
  });
}
