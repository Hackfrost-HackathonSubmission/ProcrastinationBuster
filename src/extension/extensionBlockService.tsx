// src/extension/extensionBlockService.ts
interface BlockedSite {
  url: string;
  isActive: boolean;
  createdAt: Date;
}

export class ExtensionBlockService {
  private static readonly STORAGE_KEY = "blockedSites";

  static async syncWithLocalStorage(): Promise<void> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return;

    const sites = JSON.parse(data);
    await chrome.storage.local.set({ [this.STORAGE_KEY]: sites });
  }

  static async getBlockedSites(): Promise<BlockedSite[]> {
    const result = await chrome.storage.local.get([this.STORAGE_KEY]);
    return (result[this.STORAGE_KEY] || []).map((site: any) => ({
      ...site,
      createdAt: new Date(site.createdAt),
    }));
  }
}
