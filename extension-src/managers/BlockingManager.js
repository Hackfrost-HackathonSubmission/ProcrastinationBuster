// extension-src/managers/BlockingManager.js

export class BlockingManager {
     constructor() {
         this.rules = [];
         this.whitelist = new Set();
         this.temporaryAllowances = new Map(); // site -> expiry timestamp
         this.RULE_ID_PREFIX = 'procrastination_buster_';
         this.isInitialized = false;
     }
 
     static getInstance() {
         if (!BlockingManager.instance) {
             BlockingManager.instance = new BlockingManager();
         }
         return BlockingManager.instance;
     }
 
     async initializeBlockingSystem() {
         if (this.isInitialized) return;
 
         try {
             // Load saved rules and whitelist
             const data = await chrome.storage.local.get([
                 'blockedSites',
                 'whitelist',
                 'temporaryAllowances'
             ]);
 
             this.whitelist = new Set(data.whitelist || []);
             this.temporaryAllowances = new Map(data.temporaryAllowances || []);
 
             // Clean up expired temporary allowances
             this.cleanupTemporaryAllowances();
 
             // Generate and apply initial rules
             await this.setupBaseRules();
             await this.updateBlockingRules();
 
             // Set up periodic rule updates
             this.scheduleRuleUpdate();
 
             this.isInitialized = true;
         } catch (error) {
             console.error('Failed to initialize blocking system:', error);
             throw error;
         }
     }
 
     async updateBlockingRules() {
         try {
             const settings = await chrome.storage.local.get('settings');
             const currentSession = await chrome.storage.local.get('currentSession');
 
             if (this.shouldEnableBlocking(settings?.settings, currentSession?.currentSession)) {
                 const blockedSites = await this.getBlockedSites();
                 const rules = this.generateBlockingRules(blockedSites);
                 await this.applyRules(rules);
             } else {
                 await this.clearAllBlockingRules();
             }
         } catch (error) {
             console.error('Failed to update blocking rules:', error);
         }
     }
 
     scheduleRuleUpdate() {
         // Update rules every minute
         setInterval(() => {
             this.updateBlockingRules();
             this.cleanupTemporaryAllowances();
         }, 60000);
     }
 
     generateBlockingRules(blockedSites) {
         const rules = [];
         let ruleId = 1;
 
         for (const site of blockedSites) {
             if (this.isTemporarilyAllowed(site) || this.whitelist.has(site)) {
                 continue;
             }
 
             const pattern = this.preprocessUrlPattern(site);
             rules.push({
                 id: ruleId++,
                 priority: 1,
                 action: { type: 'redirect', redirect: { url: 'blocked.html' } },
                 condition: {
                     urlFilter: pattern,
                     resourceTypes: ['main_frame']
                 }
             });
         }
 
         return rules;
     }
 
     preprocessUrlPattern(site) {
         // Remove protocol if present
         let pattern = site.replace(/^https?:\/\//, '');
         
         // Handle wildcard subdomains
         if (pattern.startsWith('*.')) {
             pattern = pattern.substring(2);
         }
         
         // Escape special characters
         pattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
         
         // Add wildcard for subdomains if not present
         if (!pattern.startsWith('*')) {
             pattern = '*.' + pattern;
         }
         
         return pattern;
     }
 
     async applyRules(rules) {
         try {
             // First, remove existing rules
             await this.clearAllBlockingRules();
 
             // Then add new rules
             if (rules.length > 0) {
                 await chrome.declarativeNetRequest.updateDynamicRules({
                     addRules: rules
                 });
             }
 
             this.rules = rules;
         } catch (error) {
             console.error('Failed to apply blocking rules:', error);
             throw error;
         }
     }
 
     async temporarilyAllowSite(site, minutes = 5) {
         const expiryTime = Date.now() + (minutes * 60 * 1000);
         this.temporaryAllowances.set(site, expiryTime);
         
         await chrome.storage.local.set({
             temporaryAllowances: Array.from(this.temporaryAllowances.entries())
         });
 
         // Update rules immediately
         await this.updateBlockingRules();
 
         // Schedule removal of temporary allowance
         setTimeout(() => {
             this.temporaryAllowances.delete(site);
             this.updateBlockingRules();
         }, minutes * 60 * 1000);
     }
 
     async addToWhitelist(site) {
         this.whitelist.add(site);
         await chrome.storage.local.set({
             whitelist: Array.from(this.whitelist)
         });
         await this.updateBlockingRules();
     }
 
     async removeFromWhitelist(site) {
         this.whitelist.delete(site);
         await chrome.storage.local.set({
             whitelist: Array.from(this.whitelist)
         });
         await this.updateBlockingRules();
     }
 
     isTemporarilyAllowed(site) {
         const expiryTime = this.temporaryAllowances.get(site);
         if (!expiryTime) return false;
         return Date.now() < expiryTime;
     }
 
     cleanupTemporaryAllowances() {
         const now = Date.now();
         let changed = false;
 
         for (const [site, expiry] of this.temporaryAllowances.entries()) {
             if (now >= expiry) {
                 this.temporaryAllowances.delete(site);
                 changed = true;
             }
         }
 
         if (changed) {
             chrome.storage.local.set({
                 temporaryAllowances: Array.from(this.temporaryAllowances.entries())
             });
             this.updateBlockingRules();
         }
     }
 
     async setupBaseRules() {
         const defaultBlockedSites = [
             'facebook.com',
             'twitter.com',
             'instagram.com',
             'reddit.com',
             'youtube.com'
         ];
 
         const data = await chrome.storage.local.get('blockedSites');
         if (!data.blockedSites) {
             await chrome.storage.local.set({ blockedSites: defaultBlockedSites });
         }
     }
 
     shouldEnableBlocking(settings, currentSession) {
         if (!settings?.blockingEnabled) return false;
         if (!currentSession) return false;
         
         return currentSession.type === 'focus' && 
                currentSession.state !== 'paused';
     }
 
     async clearAllBlockingRules() {
         if (this.rules.length > 0) {
             const removeRuleIds = this.rules.map(rule => rule.id);
             await chrome.declarativeNetRequest.updateDynamicRules({
                 removeRuleIds
             });
             this.rules = [];
         }
     }
 
     async getBlockedSites() {
         const data = await chrome.storage.local.get('blockedSites');
         return data.blockedSites || [];
     }
 
     async addBlockedSite(site) {
         const sites = await this.getBlockedSites();
         if (!sites.includes(site)) {
             sites.push(site);
             await chrome.storage.local.set({ blockedSites: sites });
             await this.updateBlockingRules();
         }
     }
 
     async removeBlockedSite(site) {
         const sites = await this.getBlockedSites();
         const index = sites.indexOf(site);
         if (index > -1) {
             sites.splice(index, 1);
             await chrome.storage.local.set({ blockedSites: sites });
             await this.updateBlockingRules();
         }
     }
 }
 
 export default BlockingManager;