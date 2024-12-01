// background.js

let managers = {};

// Initialize managers when service worker starts
async function initializeManagers() {
  try {
    // Initialize Settings first as other managers depend on it
    managers.settings = await initializeSettingsManager();
    managers.notification = await initializeNotificationManager();
    managers.timer = await initializeTimerManager();
    managers.activity = await initializeActivityManager();
    managers.blocking = await initializeBlockingManager();
    managers.analytics = await initializeProductivityAnalytics();
    managers.sync = await initializeSyncManager();

    console.log("All managers initialized successfully");
  } catch (error) {
    console.error("Failed to initialize managers:", error);
  }
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((response) => {
      sendResponse(response);
    })
    .catch((error) => {
      console.error("Error handling message:", error);
      sendResponse({ error: error.message });
    });
  return true; // Keep message channel open for async response
});

// Handle messages
async function handleMessage(message, sender) {
  switch (message.action) {
    case "startTimer":
      return await managers.timer.startTimer(message.duration, message.type);

    case "pauseTimer":
      return await managers.timer.pauseTimer();

    case "resumeTimer":
      return await managers.timer.resumeTimer();

    case "stopTimer":
      return await managers.timer.stopTimer();

    case "getTimerState":
      return await managers.timer.getState();

    case "updateSettings":
      return await managers.settings.updateSettings(message.settings);

    case "getSettings":
      return await managers.settings.getSettings();

    case "allowSiteTemporarily":
      return await managers.blocking.temporarilyAllowSite(
        message.site,
        message.duration
      );

    case "getProductivityStats":
      return await managers.analytics.getProductivityReport(message.timeframe);

    default:
      throw new Error("Unknown message action: " + message.action);
  }
}

// Setup context menus
function setupContextMenus() {
  chrome.contextMenus.create({
    id: "startFocusSession",
    title: "Start Focus Session",
    contexts: ["action"],
  });

  chrome.contextMenus.create({
    id: "takeBreak",
    title: "Take a Break",
    contexts: ["action"],
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "startFocusSession":
      managers.timer.startTimer(25, "focus");
      break;
    case "takeBreak":
      managers.timer.startTimer(5, "break");
      break;
  }
});

// Update badge text
function updateBadge() {
  if (managers.timer) {
    managers.timer.getState().then((state) => {
      if (state.isRunning) {
        const minutes = Math.ceil(state.timeRemaining / 60);
        chrome.action.setBadgeText({ text: minutes.toString() });
        chrome.action.setBadgeBackgroundColor({
          color: state.type === "focus" ? "#4CAF50" : "#2196F3",
        });
      } else {
        chrome.action.setBadgeText({ text: "" });
      }
    });
  }
}

// Setup installation handling
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await managers.settings?.resetToDefaults();
    chrome.notifications.create("welcome", {
      type: "basic",
      iconUrl: "icon128.png",
      title: "Welcome to ProcrastinationBuster!",
      message: "Click to learn how to stay focused and productive.",
      buttons: [{ title: "Get Started" }],
    });
  }
  setupContextMenus();
});

// Initialize everything when service worker starts
initializeManagers();

// Setup periodic badge updates
setInterval(updateBadge, 1000);

// Keep service worker alive
chrome.runtime.onConnect.addListener(function (port) {
  port.onDisconnect.addListener(function () {
    console.log("Port disconnected, keeping service worker alive");
  });
});
