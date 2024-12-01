// src/services/extensionService.tsx
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

interface ChromeStorageResult {
  [key: string]: SerializedBlockedSite[];
}

export class ExtensionService {
  private static readonly STORAGE_KEY = "blockedSites";

  static async getBlockedSites(): Promise<BlockedSite[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [this.STORAGE_KEY],
        (result: ChromeStorageResult) => {
          const sites = result[this.STORAGE_KEY] || [];
          resolve(
            sites.map((site: SerializedBlockedSite) => ({
              ...site,
              createdAt: new Date(site.createdAt),
            }))
          );
        }
      );
    });
  }

  static async saveBlockedSites(sites: BlockedSite[]): Promise<void> {
    return new Promise((resolve) => {
      const serializedSites: SerializedBlockedSite[] = sites.map((site) => ({
        ...site,
        createdAt: site.createdAt.toISOString(),
      }));

      chrome.storage.local.set(
        {
          [this.STORAGE_KEY]: serializedSites,
        },
        resolve
      );
    });
  }

  static async syncWithWebapp(): Promise<void> {
    try {
      const webappData = localStorage.getItem(this.STORAGE_KEY);
      if (webappData) {
        const parsedData = JSON.parse(webappData) as SerializedBlockedSite[];
        const sites: BlockedSite[] = parsedData.map((site) => ({
          ...site,
          createdAt: new Date(site.createdAt),
        }));
        await this.saveBlockedSites(sites);
      }
    } catch (error) {
      console.error("Error syncing with webapp:", error);
    }
  }
}
