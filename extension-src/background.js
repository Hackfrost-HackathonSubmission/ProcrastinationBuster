import TimerManager from "./managers/TimerManager";
import ActivityManager from "./managers/ActivityManager";
import BlockingManager from "./managers/BlockingManager";
import SettingsManager from "./managers/SettingsManager";
import ProductivityAnalytics from "./managers/ProductivityAnalytics";
import DataSyncManager from "./managers/DataSyncManager";
import NotificationManager from "./managers/NotificationManager";

class BackgroundService {
  constructor() {
    this.managers = {
      timer: null,
      activity: null,
      blocking: null,
      settings: null,
      analytics: null,
      sync: null,
      notification: null,
    };
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize all managers in the correct order
      this.managers.settings = SettingsManager.getInstance();
      await this.managers.settings.initialize();

      this.managers.notification = NotificationManager.getInstance();
      await this.managers.notification.initialize();

      this.managers.timer = TimerManager.getInstance();
      await this.managers.timer.initialize();

      this.managers.activity = ActivityManager.getInstance();
      await this.managers.activity.initialize();

      this.managers.blocking = BlockingManager.getInstance();
      await this.managers.blocking.initialize();

      this.managers.analytics = ProductivityAnalytics.getInstance();
      await this.managers.analytics.initialize();

      this.managers.sync = DataSyncManager.getInstance();
      await this.managers.sync.initialize();

      this.setupMessageListeners();
      this.setupContextMenus();
      this.setupBadgeUpdates();
      this.setupInstallListener();

      this.isInitialized = true;
      console.log("Background service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize background service:", error);
      throw error;
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case "startTimer":
          await this.managers.timer.startTimer(message.duration, message.type);
          break;

        case "pauseTimer":
          await this.managers.timer.pauseTimer();
          break;

        case "resumeTimer":
          await this.managers.timer.resumeTimer();
          break;

        case "stopTimer":
          await this.managers.timer.stopTimer();
          break;

        case "getTimerState":
          sendResponse(await this.managers.timer.getState());
          break;

        case "updateSettings":
          await this.managers.settings.updateSettings(message.settings);
          break;

        case "getSettings":
          sendResponse(await this.managers.settings.getSettings());
          break;

        case "allowSiteTemporarily":
          await this.managers.blocking.temporarilyAllowSite(
            message.site,
            message.duration
          );
          break;

        case "getProductivityStats":
          sendResponse(
            await this.managers.analytics.getProductivityReport(
              message.timeframe
            )
          );
          break;

        case "createBackup":
          await this.managers.sync.createBackup();
          break;

        case "restoreBackup":
          await this.managers.sync.restoreBackup(message.file);
          break;

        case "syncNow":
          await this.managers.sync.forceSyncNow();
          break;

        default:
          console.warn("Unknown message action:", message.action);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ error: error.message });
    }
  }

  setupContextMenus() {
    chrome.contextMenus.create({
      id: "startFocusSession",
      title: "Start Focus Session",
      contexts: ["browser_action"],
    });

    chrome.contextMenus.create({
      id: "takeBreak",
      title: "Take a Break",
      contexts: ["browser_action"],
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      switch (info.menuItemId) {
        case "startFocusSession":
          this.managers.timer.startTimer(25, "focus");
          break;
        case "takeBreak":
          this.managers.timer.startTimer(5, "break");
          break;
      }
    });
  }

  setupBadgeUpdates() {
    // Update badge with timer countdown
    setInterval(async () => {
      const state = await this.managers.timer.getState();
      if (state.isRunning) {
        const minutes = Math.ceil(state.timeRemaining / 60);
        chrome.action.setBadgeText({ text: minutes.toString() });
        chrome.action.setBadgeBackgroundColor({
          color: state.type === "focus" ? "#4CAF50" : "#2196F3",
        });
      } else {
        chrome.action.setBadgeText({ text: "" });
      }
    }, 1000);
  }

  setupInstallListener() {
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === "install") {
        await this.managers.settings.resetToDefaults();

        this.managers.notification.showNotification({
          title: "Welcome to ProcrastinationBuster!",
          message: "Click to learn how to stay focused and productive.",
          type: "basic",
          buttons: [
            {
              title: "Get Started",
            },
          ],
        });
      } else if (details.reason === "update") {
        console.log("Extension updated:", details.previousVersion);
      }
    });
  }
}

const backgroundService = new BackgroundService();
backgroundService.initialize().catch((error) => {
  console.error("Failed to start background service:", error);
});

export default backgroundService;
