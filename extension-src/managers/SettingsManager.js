export const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  notifications: {
    enabled: true,
    sound: true,
    breakReminders: true,
  },
  blockingEnabled: true,
  blockedSites: [],
  whitelistedSites: [],
  theme: "light",
};

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  static getInstance() {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  async initialize() {
    const data = await chrome.storage.local.get("settings");
    this.settings = data.settings || { ...DEFAULT_SETTINGS };
    return this.settings;
  }

  async getSettings() {
    return this.settings;
  }

  async updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    await chrome.storage.local.set({ settings: this.settings });

    // Notify other parts of the extension about settings change
    chrome.runtime.sendMessage({
      action: "settingsUpdated",
      data: this.settings,
    });

    return this.settings;
  }

  async resetToDefaults() {
    this.settings = { ...DEFAULT_SETTINGS };
    await chrome.storage.local.set({ settings: this.settings });

    chrome.runtime.sendMessage({
      action: "settingsReset",
      data: this.settings,
    });

    return this.settings;
  }

  async getSetting(key) {
    return this.settings[key];
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await chrome.storage.local.set({ settings: this.settings });

    chrome.runtime.sendMessage({
      action: "settingUpdated",
      data: { key, value },
    });

    return this.settings;
  }
}

export default SettingsManager;
