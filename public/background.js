// public/background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_BLOCKED_SITES") {
    chrome.storage.local.set(
      {
        blockedSites: message.sites,
      },
      () => {
        // Notify all extension windows
        chrome.runtime.sendMessage({
          type: "SITES_UPDATED",
          sites: message.sites,
        });
      }
    );
  }
});

// Listen for web app events
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "UPDATE_BLOCKED_SITES") {
      chrome.storage.local.set(
        {
          blockedSites: request.sites,
        },
        () => {
          sendResponse({ success: true });
        }
      );
    }
    return true; // Required for async response
  }
);
