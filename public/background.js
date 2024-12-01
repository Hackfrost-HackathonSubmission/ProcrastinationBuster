// public/background.js
const STORAGE_KEY = "blockedSites";

// Sync storage on extension load
chrome.runtime.onInstalled.addListener(() => {
  const webappData = localStorage.getItem(STORAGE_KEY);
  if (webappData) {
    chrome.storage.local.set({ [STORAGE_KEY]: JSON.parse(webappData) });
  }
});

// Check URLs against blocked sites
chrome.webNavigation.onCompleted.addListener((details) => {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const sites = result[STORAGE_KEY] || [];
    const url = new URL(details.url);
    const hostname = url.hostname.replace(/^www\./, "");

    const isBlocked = sites.some(
      (site) => site.isActive && site.url === hostname
    );

    if (isBlocked) {
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL("blocked.html"),
      });
    }
  });
});

// Listen for storage changes from webapp
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes[STORAGE_KEY]) {
    const newSites = changes[STORAGE_KEY].newValue;
    // Update local storage to keep in sync
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSites));
  }
});
