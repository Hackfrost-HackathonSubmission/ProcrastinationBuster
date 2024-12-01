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
export interface ChromeStorageResult {
  [key: string]: SerializedBlockedSite[];
}
export class BlockService {
  private static readonly STORAGE_KEY = "blockedSites";

  // Web-only storage methods
  private static async saveToLocalStorage(sites: BlockedSite[]): Promise<void> {
    try {
      const serializedSites = sites.map((site) => ({
        ...site,
        createdAt: site.createdAt.toISOString(),
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializedSites));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  private static getFromLocalStorage(): BlockedSite[] {
    try {
      const sitesJson = localStorage.getItem(this.STORAGE_KEY);
      if (!sitesJson) return [];

      const sites = JSON.parse(sitesJson) as SerializedBlockedSite[];
      return sites.map((site) => ({
        ...site,
        createdAt: new Date(site.createdAt),
      }));
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return [];
    }
  }

  static async getBlockedSites(): Promise<BlockedSite[]> {
    return this.getFromLocalStorage();
  }

  static async addBlockedSite(url: string): Promise<BlockedSite> {
    try {
      const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
      const sites = this.getFromLocalStorage();

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
      await this.saveToLocalStorage(sites);

      return newSite;
    } catch (error) {
      console.error("Error adding blocked site:", error);
      throw new Error("Failed to add blocked site");
    }
  }

  static async removeBlockedSite(url: string): Promise<void> {
    try {
      const sites = this.getFromLocalStorage();
      const filteredSites = sites.filter((site) => site.url !== url);
      await this.saveToLocalStorage(filteredSites);
    } catch (error) {
      console.error("Error removing blocked site:", error);
      throw new Error("Failed to remove blocked site");
    }
  }

  static async toggleBlockedSite(url: string): Promise<BlockedSite | null> {
    try {
      const sites = this.getFromLocalStorage();
      const siteIndex = sites.findIndex((site) => site.url === url);

      if (siteIndex === -1) return null;

      sites[siteIndex].isActive = !sites[siteIndex].isActive;
      await this.saveToLocalStorage(sites);

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
      const sites = this.getFromLocalStorage();

      return sites.some((site) => site.isActive && site.url === currentHost);
    } catch (error) {
      console.error("Error checking if site is blocked:", error);
      return false;
    }
  }
}
