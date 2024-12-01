// src/services/blockService.ts
"use client";

interface BlockedSite {
  url: string;
  isActive: boolean;
  createdAt: Date;
}

export class BlockService {
  private static readonly STORAGE_KEY = "blockedSites";

  static getBlockedSites(): BlockedSite[] {
    if (typeof window === "undefined") return [];

    const sites = localStorage.getItem(this.STORAGE_KEY);
    return sites ? JSON.parse(sites) : [];
  }

  static addBlockedSite(url: string): BlockedSite {
    // Clean the URL (remove protocol and www)
    const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");

    const sites = this.getBlockedSites();

    // Check if site already exists
    if (sites.some((site) => site.url === cleanUrl)) {
      return sites.find((site) => site.url === cleanUrl)!;
    }

    const newSite: BlockedSite = {
      url: cleanUrl,
      isActive: true,
      createdAt: new Date(),
    };

    sites.push(newSite);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sites));

    return newSite;
  }

  static removeBlockedSite(url: string): void {
    const sites = this.getBlockedSites().filter((site) => site.url !== url);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sites));
  }

  static toggleBlockedSite(url: string): BlockedSite | null {
    const sites = this.getBlockedSites();
    const siteIndex = sites.findIndex((site) => site.url === url);

    if (siteIndex === -1) return null;

    sites[siteIndex].isActive = !sites[siteIndex].isActive;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sites));

    return sites[siteIndex];
  }

  static isCurrentSiteBlocked(): boolean {
    if (typeof window === "undefined") return false;

    const currentHost = window.location.hostname
      .toLowerCase()
      .replace(/^www\./, "");
    const sites = this.getBlockedSites();

    return sites.some((site) => site.isActive && site.url === currentHost);
  }
}
