chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Get blocked sites from storage
  const { blockedSites } = await chrome.storage.local.get("blockedSites");

  if (!blockedSites) return;

  // Check if the URL matches any blocked sites
  const url = new URL(details.url);
  const hostname = url.hostname.replace("www.", "");

  const isBlocked = blockedSites.some(
    (site) => site.isActive && hostname.includes(site.url)
  );

  if (isBlocked) {
    // Redirect to your blocked page
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL("blocked.html"),
    });
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.blockedSites) {
    console.log("Blocked sites updated:", changes.blockedSites.newValue);
    // Refresh your blocking logic if needed
  }
});
