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
       try {
         const sites = localStorage.getItem(this.STORAGE_KEY);
         if (sites) {
           const parsedSites = JSON.parse(sites);
           // Convert string dates back to Date objects
           return parsedSites.map((site: any) => ({
             ...site,
             createdAt: new Date(site.createdAt)
           }));
         }
         return [];
       } catch (error) {
         console.error('Error getting blocked sites:', error);
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
         localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sites));
   
         // Broadcast the change to extension if available
         if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
           chrome.runtime.sendMessage({
             type: "ADD_BLOCKED_SITE",
             site: newSite
           }).catch(console.error);
         }
   
         return newSite;
       } catch (error) {
         console.error('Error adding blocked site:', error);
         throw new Error('Failed to add blocked site');
       }
     }
   
     static async removeBlockedSite(url: string): Promise<void> {
       try {
         const sites = await this.getBlockedSites();
         const filteredSites = sites.filter((site) => site.url !== url);
         localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredSites));
   
         // Notify extension
         if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
           chrome.runtime.sendMessage({
             type: "REMOVE_BLOCKED_SITE",
             url: url
           }).catch(console.error);
         }
       } catch (error) {
         console.error('Error removing blocked site:', error);
         throw new Error('Failed to remove blocked site');
       }
     }
   
     static async toggleBlockedSite(url: string): Promise<BlockedSite | null> {
       try {
         const sites = await this.getBlockedSites();
         const siteIndex = sites.findIndex((site) => site.url === url);
   
         if (siteIndex === -1) return null;
   
         sites[siteIndex].isActive = !sites[siteIndex].isActive;
         localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sites));
   
         // Notify extension
         if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
           chrome.runtime.sendMessage({
             type: "TOGGLE_BLOCKED_SITE",
             url: url,
             isActive: sites[siteIndex].isActive
           }).catch(console.error);
         }
   
         return sites[siteIndex];
       } catch (error) {
         console.error('Error toggling blocked site:', error);
         throw new Error('Failed to toggle blocked site');
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
         console.error('Error checking if site is blocked:', error);
         return false;
       }
     }
   }