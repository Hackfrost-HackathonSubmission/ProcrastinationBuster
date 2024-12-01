// extension-src/managers/DataSyncManager.js

export class DataSyncManager {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.maxRetries = 3;
    this.retryDelay = 30000; // 30 seconds
    this.dataTypes = {
      SETTINGS: "settings",
      ANALYTICS: "analytics",
      SESSIONS: "sessions",
      BLOCKED_SITES: "blockedSites",
      ACHIEVEMENTS: "achievements",
    };
  }

  static getInstance() {
    if (!DataSyncManager.instance) {
      DataSyncManager.instance = new DataSyncManager();
    }
    return DataSyncManager.instance;
  }

  async initialize() {
    try {
      await this.loadSyncState();
      this.setupAutoSync();
      this.setupSyncListeners();
      await this.performInitialSync();
    } catch (error) {
      console.error("Failed to initialize DataSyncManager:", error);
      throw error;
    }
  }

  async loadSyncState() {
    const state = await chrome.storage.local.get("syncState");
    this.lastSyncTime = state.syncState?.lastSyncTime || null;
  }

  setupAutoSync() {
    // Regular sync interval
    setInterval(() => this.syncData(), this.syncInterval);

    // Listen for online/offline events
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());
  }

  setupSyncListeners() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "sync" && !this.syncInProgress) {
        this.handleStorageChange(changes);
      }
    });
  }

  async syncData(retryCount = 0) {
    if (this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;
    try {
      // Get local data
      const localData = await this.getLocalData();

      // Get sync data
      const syncData = await this.getSyncData();

      // Merge data
      const mergedData = this.mergeData(localData, syncData);

      // Update both storages
      await this.updateStorage(mergedData);

      this.lastSyncTime = Date.now();
      await this.saveSyncState();

      this.notifySyncComplete();
    } catch (error) {
      console.error("Sync failed:", error);
      if (retryCount < this.maxRetries) {
        setTimeout(() => this.syncData(retryCount + 1), this.retryDelay);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  async getLocalData() {
    const data = {};
    for (const type of Object.values(this.dataTypes)) {
      const result = await chrome.storage.local.get(type);
      data[type] = result[type];
    }
    return data;
  }

  async getSyncData() {
    const data = {};
    for (const type of Object.values(this.dataTypes)) {
      const result = await chrome.storage.sync.get(type);
      data[type] = result[type];
    }
    return data;
  }

  mergeData(localData, syncData) {
    const merged = {};

    for (const type of Object.values(this.dataTypes)) {
      merged[type] = this.mergeDataType(localData[type], syncData[type], type);
    }

    return merged;
  }

  mergeDataType(localData, syncData, type) {
    if (!localData) return syncData;
    if (!syncData) return localData;

    switch (type) {
      case this.dataTypes.SETTINGS:
        return this.mergeSettings(localData, syncData);
      case this.dataTypes.ANALYTICS:
        return this.mergeAnalytics(localData, syncData);
      case this.dataTypes.SESSIONS:
        return this.mergeSessions(localData, syncData);
      case this.dataTypes.BLOCKED_SITES:
        return this.mergeBlockedSites(localData, syncData);
      case this.dataTypes.ACHIEVEMENTS:
        return this.mergeAchievements(localData, syncData);
      default:
        return localData;
    }
  }

  async updateStorage(mergedData) {
    const syncPromise = chrome.storage.sync.set(mergedData);
    const localPromise = chrome.storage.local.set(mergedData);
    await Promise.all([syncPromise, localPromise]);
  }

  async saveSyncState() {
    await chrome.storage.local.set({
      syncState: {
        lastSyncTime: this.lastSyncTime,
      },
    });
  }

  mergeSettings(local, sync) {
    return {
      ...sync,
      ...local,
      lastUpdated: Math.max(local?.lastUpdated || 0, sync?.lastUpdated || 0),
    };
  }

  mergeAnalytics(local, sync) {
    const merged = {
      dailyStats: { ...sync?.dailyStats, ...local?.dailyStats },
      weeklyStats: { ...sync?.weeklyStats, ...local?.weeklyStats },
      monthlyStats: { ...sync?.monthlyStats, ...local?.monthlyStats },
    };

    // Merge session histories
    const allSessions = [
      ...(local?.sessionHistory || []),
      ...(sync?.sessionHistory || []),
    ];
    merged.sessionHistory = this.deduplicateSessions(allSessions);

    return merged;
  }

  mergeSessions(local, sync) {
    const allSessions = [...(local || []), ...(sync || [])];
    return this.deduplicateSessions(allSessions);
  }

  mergeBlockedSites(local, sync) {
    return Array.from(new Set([...(local || []), ...(sync || [])]));
  }

  mergeAchievements(local, sync) {
    const merged = { ...sync, ...local };
    Object.keys(merged).forEach((achievementId) => {
      if (
        local?.[achievementId]?.timestamp &&
        sync?.[achievementId]?.timestamp
      ) {
        merged[achievementId] =
          local[achievementId].timestamp > sync[achievementId].timestamp
            ? local[achievementId]
            : sync[achievementId];
      }
    });
    return merged;
  }

  deduplicateSessions(sessions) {
    const sessionMap = new Map();
    sessions.forEach((session) => {
      const key = `${session.timestamp}-${session.type}`;
      if (
        !sessionMap.has(key) ||
        session.lastModified > sessionMap.get(key).lastModified
      ) {
        sessionMap.set(key, session);
      }
    });
    return Array.from(sessionMap.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  async handleStorageChange(changes) {
    if (this.syncInProgress) return;

    const relevantChanges = Object.keys(changes).filter((key) =>
      Object.values(this.dataTypes).includes(key)
    );

    if (relevantChanges.length > 0) {
      await this.syncData();
    }
  }

  async handleOnline() {
    await this.syncData();
  }

  handleOffline() {
    // Implement offline mode handling if needed
  }

  notifySyncComplete() {
    chrome.runtime.sendMessage({
      action: "syncComplete",
      timestamp: this.lastSyncTime,
    });
  }

  async createBackup() {
    const data = await this.getLocalData();
    const backup = {
      data,
      timestamp: Date.now(),
      version: chrome.runtime.getManifest().version,
    };

    const blob = new Blob([JSON.stringify(backup)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download(
      {
        url: url,
        filename: `procrastination_buster_backup_${new Date()
          .toISOString()
          .slice(0, 10)}.json`,
        saveAs: true,
      },
      (downloadId) => {
        URL.revokeObjectURL(url);
      }
    );
  }

  async restoreBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const backup = JSON.parse(event.target.result);

          // Validate backup format
          if (!this.validateBackup(backup)) {
            throw new Error("Invalid backup format");
          }

          // Stop auto-sync temporarily
          this.syncInProgress = true;

          // Restore data to local storage
          await this.restoreData(backup.data);

          // Trigger sync to update sync storage
          this.syncInProgress = false;
          await this.syncData();

          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read backup file"));
      reader.readAsText(file);
    });
  }

  validateBackup(backup) {
    // Check if backup has required properties
    if (!backup.data || !backup.timestamp || !backup.version) {
      return false;
    }

    // Check if all required data types are present
    for (const type of Object.values(this.dataTypes)) {
      if (!backup.data.hasOwnProperty(type)) {
        return false;
      }
    }

    // Check if version is compatible
    const currentVersion = chrome.runtime.getManifest().version;
    const backupVersion = backup.version.split(".");
    const currentVersionParts = currentVersion.split(".");

    // Major version must match
    if (backupVersion[0] !== currentVersionParts[0]) {
      return false;
    }

    return true;
  }

  async restoreData(backupData) {
    try {
      // Clear existing data
      await this.clearLocalData();

      // Restore each data type
      for (const type of Object.values(this.dataTypes)) {
        if (backupData[type]) {
          await chrome.storage.local.set({ [type]: backupData[type] });
        }
      }

      // Update last sync time
      this.lastSyncTime = Date.now();
      await this.saveSyncState();

      return true;
    } catch (error) {
      console.error("Failed to restore data:", error);
      throw error;
    }
  }

  async clearLocalData() {
    const keysToRemove = Object.values(this.dataTypes);
    await chrome.storage.local.remove(keysToRemove);
  }

  async exportData() {
    const data = await this.getLocalData();
    return {
      data,
      timestamp: Date.now(),
      version: chrome.runtime.getManifest().version,
    };
  }

  async importData(importedData) {
    if (!this.validateBackup(importedData)) {
      throw new Error("Invalid import data format");
    }

    await this.restoreData(importedData.data);
    await this.syncData();
  }

  getLastSyncTime() {
    return this.lastSyncTime;
  }

  isSyncing() {
    return this.syncInProgress;
  }

  async forceSyncNow() {
    if (this.syncInProgress) {
      throw new Error("Sync already in progress");
    }
    return await this.syncData();
  }

  async resetSyncState() {
    this.lastSyncTime = null;
    this.syncInProgress = false;
    await this.saveSyncState();
  }
}

export default DataSyncManager;
