'use client';

interface BlockedSite {
  url: string;
  pattern: string; // URL pattern to match
  isActive: boolean;
  createdAt: Date;
}

export class BlockService {
  private static readonly STORAGE_KEY = 'blockedSites';
  
  // Get all blocked sites
  static getBlockedSites(): BlockedSite[] {
    if (typeof window === 'undefined') return [];
    
    const sites = localStorage.getItem(this.STORAGE_KEY);
    return sites ? JSON.parse(sites) : [];
  }

  // Add a new site to block
  static addBlockedSite(url: string): BlockedSite {
    const sites = this.getBlockedSites();
    
    // Create URL pattern (supports wildcards)
    const pattern = url
      .replace(/[.]/g, '\\.')  // Escape dots
      .replace(/\*/g, '.*');   // Convert * to .*
    
    const newSite: BlockedSite = {
      url,
      pattern,
      isActive: true,
      createdAt: new Date()
    };
    
    sites.push(newSite);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sites));
    
    return newSite;
  }

  // Remove a blocked site
  static removeBlockedSite(url: string): void {
    const sites = this.getBlockedSites()
      .filter(site => site.url !== url);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sites));
  }

  // Toggle blocking for a site
  static toggleBlockedSite(url: string): BlockedSite | null {
    const sites = this.getBlockedSites();
    const siteIndex = sites.findIndex(site => site.url === url);
    
    if (siteIndex === -1) return null;
    
    sites[siteIndex].isActive = !sites[siteIndex].isActive;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sites));
    
    return sites[siteIndex];
  }

  // Check if a URL is blocked
  static isBlocked(url: string): boolean {
    const sites = this.getBlockedSites();
    return sites.some(site => {
      if (!site.isActive) return false;
      const regex = new RegExp(site.pattern);
      return regex.test(url);
    });
  }
}