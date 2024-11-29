// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.set({
    isEnabled: true,
    focusMode: false,
    blockedSites: [],
    focusTimer: 25, // default pomodoro time
  });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    checkUrl(changeInfo.url, tabId);
  }
});
