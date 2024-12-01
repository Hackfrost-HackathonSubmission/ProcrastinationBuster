// src/utils/siteBlocker.ts
import { BlockedSite } from "@/types";

export const addBlockedSite = (url: string) => {
  const sites = getBlockedSites();
  const newSite: BlockedSite = {
    url,
    addedAt: Date.now(),
  };

  sites.push(newSite);
  localStorage.setItem("blockedSites", JSON.stringify(sites));
};

export const getBlockedSites = (): BlockedSite[] => {
  const sites = localStorage.getItem("blockedSites");
  return sites ? JSON.parse(sites) : [];
};

export const removeBlockedSite = (url: string) => {
  const sites = getBlockedSites().filter((site) => site.url !== url);
  localStorage.setItem("blockedSites", JSON.stringify(sites));
};

export const isUrlBlocked = (url: string): boolean => {
  const sites = getBlockedSites();
  return sites.some((site) => url.includes(site.url));
};
