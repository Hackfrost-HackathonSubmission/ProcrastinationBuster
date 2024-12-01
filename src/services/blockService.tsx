// src/services/blockService.ts
"use client";

interface BlockedSite {
  url: string;
  isActive: boolean;
  createdAt: Date;
}

export class BlockService {
  private static readonly STORAGE_KEY = "blockedSites";

  static async getBlockedSites(): Promise<BlockedSite[]> {
    if (typeof chrome === "undefined" || !chrome.storage) {
      return [];
    }

    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || [];
  }

  static async addBlockedSite(url: string): Promise<BlockedSite> {
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
    await chrome.storage.local.set({ [this.STORAGE_KEY]: sites });

    return newSite;
  }

  static async removeBlockedSite(url: string): Promise<void> {
    const sites = await this.getBlockedSites();
    const filteredSites = sites.filter((site) => site.url !== url);
    await chrome.storage.local.set({ [this.STORAGE_KEY]: filteredSites });
  }

  static async toggleBlockedSite(url: string): Promise<BlockedSite | null> {
    const sites = await this.getBlockedSites();
    const siteIndex = sites.findIndex((site) => site.url === url);

    if (siteIndex === -1) return null;

    sites[siteIndex].isActive = !sites[siteIndex].isActive;
    await chrome.storage.local.set({ [this.STORAGE_KEY]: sites });

    return sites[siteIndex];
  }

  static async isCurrentSiteBlocked(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const currentHost = window.location.hostname
      .toLowerCase()
      .replace(/^www\./, "");
    const sites = await this.getBlockedSites();

    return sites.some((site) => site.isActive && site.url === currentHost);
  }
}
