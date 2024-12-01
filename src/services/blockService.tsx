// src/services/blockService.tsx
"use client";

interface BlockedSite {
  url: string;
  isActive: boolean;
  createdAt: Date;
}

interface SerializedBlockedSite {
  url: string;
  isActive: boolean;
  createdAt: string;
}

export class BlockService {
  private static readonly STORAGE_KEY = "blockedSites";

  // Method to determine if we're in the extension context
  private static isExtensionContext(): boolean {
    return typeof chrome !== "undefined" && chrome.runtime?.id !== undefined;
  }

  // Method to save sites to storage and optionally sync with extension
  private static async saveToStorage(sites: BlockedSite[]): Promise<void> {
    // Always save to localStorage
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(
        sites.map((site) => ({
          ...site,
          createdAt: site.createdAt.toISOString(),
        }))
      )
    );

    // If we're in the extension context, also save to chrome.storage
    if (this.isExtensionContext() && chrome.storage?.local) {
      try {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: sites });
      } catch (error) {
        console.error("Error saving to chrome storage:", error);
      }
    }
  }

  static async getBlockedSites(): Promise<BlockedSite[]> {
    try {
      let sites: SerializedBlockedSite[] = [];

      // Try to get sites from localStorage first
      const localSites = localStorage.getItem(this.STORAGE_KEY);
      if (localSites) {
        sites = JSON.parse(localSites);
      }

      // If we're in extension context, try to get sites from chrome.storage
      if (this.isExtensionContext() && chrome.storage?.local) {
        try {
          const result = await chrome.storage.local.get(this.STORAGE_KEY);
          if (result[this.STORAGE_KEY]) {
            sites = result[this.STORAGE_KEY];
          }
        } catch (error) {
          console.error("Error getting sites from chrome storage:", error);
        }
      }

      // Convert dates and return
      return sites.map((site) => ({
        ...site,
        createdAt: new Date(site.createdAt),
      }));
    } catch (error) {
      console.error("Error getting blocked sites:", error);
      return [];
    }
  }

  static async addBlockedSite(url: string): Promise<BlockedSite> {
    try {
      const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
      const sites = await this.getBlockedSites();

      // Check if site already exists
      const existingSite = sites.find((site) => site.url === cleanUrl);
      if (existingSite) {
        return existingSite;
      }

      const newSite: BlockedSite = {
        url: cleanUrl,
        isActive: true,
        createdAt: new Date(),
      };

      sites.push(newSite);
      await this.saveToStorage(sites);

      return newSite;
    } catch (error) {
      console.error("Error adding blocked site:", error);
      throw new Error("Failed to add blocked site");
    }
  }

  static async removeBlockedSite(url: string): Promise<void> {
    try {
      const sites = await this.getBlockedSites();
      const filteredSites = sites.filter((site) => site.url !== url);
      await this.saveToStorage(filteredSites);
    } catch (error) {
      console.error("Error removing blocked site:", error);
      throw new Error("Failed to remove blocked site");
    }
  }

  static async toggleBlockedSite(url: string): Promise<BlockedSite | null> {
    try {
      const sites = await this.getBlockedSites();
      const siteIndex = sites.findIndex((site) => site.url === url);

      if (siteIndex === -1) return null;

      sites[siteIndex].isActive = !sites[siteIndex].isActive;
      await this.saveToStorage(sites);

      return sites[siteIndex];
    } catch (error) {
      console.error("Error toggling blocked site:", error);
      throw new Error("Failed to toggle blocked site");
    }
  }

  static async isCurrentSiteBlocked(): Promise<boolean> {
    try {
      if (typeof window === "undefined") return false;

      const currentHost = window.location.hostname
        .toLowerCase()
        .replace(/^www\./, "");
      const sites = await this.getBlockedSites();

      return sites.some((site) => site.isActive && site.url === currentHost);
    } catch (error) {
      console.error("Error checking if site is blocked:", error);
      return false;
    }
  }
}
