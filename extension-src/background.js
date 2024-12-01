// background.js
import TimerManager from "./managers/TimerManager.js";
import SettingsManager from "./managers/SettingsManager.js";

// Initialize managers
let timerManager = null;
let settingsManager = null;

async function initializeManagers() {
  try {
    // Initialize Settings first as other managers might need it
    settingsManager = SettingsManager.getInstance();
    await settingsManager.initialize();

    // Initialize Timer
    timerManager = TimerManager.getInstance();
    await timerManager.initialize();

    console.log("Managers initialized successfully");
  } catch (error) {
    console.error("Failed to initialize managers:", error);
  }
}

// Message Handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error("Error handling message:", error);
      sendResponse({ error: error.message });
    });
  return true; // Keep message channel open for async response
});

// Handle different message types
async function handleMessage(message, sender) {
  try {
    switch (message.action) {
      case "startTimer":
        return await timerManager.startTimer(message.duration, message.type);

      case "pauseTimer":
        return await timerManager.pauseTimer();

      case "resumeTimer":
        return await timerManager.resumeTimer();

      case "endTimer":
        return await timerManager.endTimer(message.completed);

      case "getTimerState":
        return timerManager.getTimerState();

      case "updateSettings":
        return await settingsManager.updateSettings(message.settings);

      case "getSettings":
        return await settingsManager.getSettings();

      case "resetSettings":
        return await settingsManager.resetToDefaults();

      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  } catch (error) {
    console.error("Error in handleMessage:", error);
    throw error;
  }
}

// Setup context menu
function setupContextMenu() {
  chrome.contextMenus.create({
    id: "startFocus",
    title: "Start Focus Session",
    contexts: ["action"],
  });

  chrome.contextMenus.create({
    id: "startBreak",
    title: "Take a Break",
    contexts: ["action"],
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info) => {
  switch (info.menuItemId) {
    case "startFocus":
      timerManager.startTimer(25, "focus");
      break;
    case "startBreak":
      timerManager.startTimer(5, "break");
      break;
  }
});

// Initialize the extension
initializeManagers();
setupContextMenu();

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    console.log("Port disconnected");
  });
});
