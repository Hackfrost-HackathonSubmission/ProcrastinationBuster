// public/background.js
chrome.storage.local.get(["blockedSites"], function (result) {
  const sites = result.blockedSites || [];

  // Listen for navigation events
  chrome.webNavigation.onCompleted.addListener(function (details) {
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

// Listen for storage changes
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace === "local" && changes.blockedSites) {
    // Update our local sites list
    const sites = changes.blockedSites.newValue || [];
  }
});
