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

// Add webRequest listener to block sites
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ["isEnabled", "focusMode", "blockedSites"],
        (data) => {
          if (!data.isEnabled || !data.focusMode) {
            resolve({ cancel: false });
            return;
          }

          try {
            const url = new URL(details.url);
            const hostname = url.hostname.replace("www.", "");

            if (data.blockedSites.some((site) => hostname.includes(site))) {
              updateStats("distractions");
              resolve({
                redirectUrl: chrome.runtime.getURL("blocked.html"),
              });
            } else {
              resolve({ cancel: false });
            }
          } catch (error) {
            console.error("Error checking URL:", error);
            resolve({ cancel: false });
          }
        }
      );
    });
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame"],
  },
  ["blocking"]
);

// Track active tab changes for stats
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) checkUrl(tab.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) checkUrl(changeInfo.url);
});

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

// Rest of the timer and stats functions remain the same
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
      stats.dailyFocusTime = 0;
      stats.distractions = 0;
    }

    if (type === "focusTime") {
      stats.dailyFocusTime += 25;
    } else if (type === "distractions") {
      stats.distractions += 1;
    }

    stats.lastUpdate = new Date().toISOString();

    chrome.storage.sync.set({ stats });
  });
}
