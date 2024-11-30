// src/utils/browserAPI.ts

import { Settings, StorageKey } from "@/types";

interface ChromeMessage {
  action: string;
  minutes?: number;
  isBreak?: boolean;
}

interface MessageResponse {
  success?: boolean;
  remainingTime?: number;
  isRunning?: boolean;
  totalDuration?: number;
}

export const browserAPI = {
  storage: {
    sync: {
      get: async (key: StorageKey | null): Promise<Partial<Settings>> => {
        try {
          if (typeof chrome !== "undefined" && chrome.storage) {
            return await new Promise((resolve) =>
              chrome.storage.sync.get(key, (data) =>
                resolve(data as Partial<Settings>)
              )
            );
          }
          // Development fallback
          const stored = localStorage.getItem("extension-storage");
          return stored ? JSON.parse(stored) : {};
        } catch (error) {
          console.error("Storage get error:", error);
          return {};
        }
      },
      set: async (items: Partial<Settings>): Promise<void> => {
        try {
          if (typeof chrome !== "undefined" && chrome.storage) {
            return await new Promise((resolve) =>
              chrome.storage.sync.set(items, () => resolve())
            );
          }
          // Development fallback
          const stored = localStorage.getItem("extension-storage");
          const current = stored ? JSON.parse(stored) : {};
          localStorage.setItem(
            "extension-storage",
            JSON.stringify({
              ...current,
              ...items,
            })
          );
        } catch (error) {
          console.error("Storage set error:", error);
        }
      },
    },
  },
  runtime: {
    sendMessage: async (message: ChromeMessage): Promise<MessageResponse> => {
      try {
        if (typeof chrome !== "undefined" && chrome.runtime) {
          return await new Promise((resolve) =>
            chrome.runtime.sendMessage(message, (response) => resolve(response))
          );
        }
        // Development fallback
        console.log("Development mode - Message:", message);
        return { success: true };
      } catch (error) {
        console.error("Runtime message error:", error);
        return { success: false };
      }
    },
  },
};
