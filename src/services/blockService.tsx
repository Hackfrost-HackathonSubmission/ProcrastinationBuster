// src/services/blockService.ts
"use client";

interface BlockedSite {
  url: string;
  isActive: boolean;
  createdAt: Date;
}

export class BlockService {
  private static readonly STORAGE_KEY = "blockedSites";

  private static isExtensionEnvironment(): boolean {
    return (
      typeof chrome !== "undefined" && chrome?.storage?.local !== undefined
    );
  }

  private static async saveToStorage(sites: BlockedSite[]): Promise<void> {
    if (this.isExtensionEnvironment()) {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: sites });
    } else {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sites));
    }
  }

  static async getBlockedSites(): Promise<BlockedSite[]> {
    try {
      if (this.isExtensionEnvironment()) {
        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        return result[this.STORAGE_KEY] || [];
      } else {
        const sites = localStorage.getItem(this.STORAGE_KEY);
        return sites ? JSON.parse(sites) : [];
      }
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
