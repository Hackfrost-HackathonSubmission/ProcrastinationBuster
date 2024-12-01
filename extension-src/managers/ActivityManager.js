// extension-src/managers/ActivityManager.js

export class ActivityManager {
     constructor() {
         this.lastActiveTime = Date.now();
         this.siteData = {};
         this.categories = {
             PRODUCTIVE: 'productive',
             NEUTRAL: 'neutral',
             DISTRACTING: 'distracting'
         };
         this.defaultCategories = {
             'github.com': 'productive',
             'stackoverflow.com': 'productive',
             'youtube.com': 'distracting',
             'facebook.com': 'distracting',
             'twitter.com': 'distracting',
             'instagram.com': 'distracting'
         };
     }
 
     static getInstance() {
         if (!ActivityManager.instance) {
             ActivityManager.instance = new ActivityManager();
         }
         return ActivityManager.instance;
     }
 
     async initialize() {
         // Load saved site data
         const data = await chrome.storage.local.get('siteData');
         if (data.siteData) {
             this.siteData = data.siteData;
         }
 
         // Load custom categories
         const categories = await chrome.storage.local.get('customCategories');
         if (categories.customCategories) {
             this.defaultCategories = {
                 ...this.defaultCategories,
                 ...categories.customCategories
             };
         }
     }
 
     async updateScreenTime() {
         const now = new Date();
         const today = now.toLocaleDateString();
         const hour = now.getHours();
         
         try {
             const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
             if (tabs[0]) {
                 const url = new URL(tabs[0].url);
                 const hostname = url.hostname;
                 
                 await this.initializeSiteData(hostname, today);
                 await this.updateSiteMetrics(hostname, 1, this.determineActivityType(hostname), hour);
                 await this.saveScreenTimeData();
             }
         } catch (error) {
             console.error('Error updating screen time:', error);
         }
     }
 
     async initializeSiteData(hostname, date) {
         if (!this.siteData[date]) {
             this.siteData[date] = {};
         }
         
         if (!this.siteData[date][hostname]) {
             this.siteData[date][hostname] = {
                 totalTime: 0,
                 hourlyBreakdown: Array(24).fill(0),
                 category: this.determineActivityType(hostname),
                 visits: 0
             };
         }
     }
 
     async updateSiteMetrics(hostname, elapsedSeconds, category, hour) {
         const today = new Date().toLocaleDateString();
         
         this.siteData[today][hostname].totalTime += elapsedSeconds;
         this.siteData[today][hostname].hourlyBreakdown[hour] += elapsedSeconds;
         this.siteData[today][hostname].visits++;
         this.siteData[today][hostname].category = category;
     }
 
     async saveScreenTimeData() {
         try {
             await chrome.storage.local.set({ siteData: this.siteData });
             
             // Clean up old data (keep only last 30 days)
             const thirtyDaysAgo = new Date();
             thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
             
             for (const date in this.siteData) {
                 if (new Date(date) < thirtyDaysAgo) {
                     delete this.siteData[date];
                 }
             }
         } catch (error) {
             console.error('Error saving screen time data:', error);
         }
     }
 
     async getScreenTimeInsights() {
         const today = new Date().toLocaleDateString();
         const insights = {
             mostVisitedSites: [],
             productiveTime: 0,
             distractingTime: 0,
             mostProductiveHour: null,
             leastProductiveHour: null,
             totalTime: 0
         };
 
         if (!this.siteData[today]) {
             return insights;
         }
 
         // Calculate site-specific metrics
         const siteMetrics = Object.entries(this.siteData[today]).map(([site, data]) => ({
             site,
             totalTime: data.totalTime,
             category: data.category,
             visits: data.visits
         }));
 
         // Sort by total time
         insights.mostVisitedSites = siteMetrics
             .sort((a, b) => b.totalTime - a.totalTime)
             .slice(0, 5);
 
         // Calculate category totals
         for (const metric of siteMetrics) {
             insights.totalTime += metric.totalTime;
             if (metric.category === this.categories.PRODUCTIVE) {
                 insights.productiveTime += metric.totalTime;
             } else if (metric.category === this.categories.DISTRACTING) {
                 insights.distractingTime += metric.totalTime;
             }
         }
 
         // Find most/least productive hours
         const hourlyProductivity = this.calculateHourlyProductivity(today);
         if (hourlyProductivity.length > 0) {
             insights.mostProductiveHour = hourlyProductivity
                 .reduce((max, curr) => curr.productivity > max.productivity ? curr : max).hour;
             insights.leastProductiveHour = hourlyProductivity
                 .reduce((min, curr) => curr.productivity < min.productivity ? curr : min).hour;
         }
 
         return insights;
     }
 
     calculateHourlyProductivity(date) {
         const hourlyData = Array(24).fill().map((_, hour) => ({
             hour,
             productivity: 0,
             totalTime: 0
         }));
 
         for (const [site, data] of Object.entries(this.siteData[date] || {})) {
             data.hourlyBreakdown.forEach((seconds, hour) => {
                 hourlyData[hour].totalTime += seconds;
                 if (data.category === this.categories.PRODUCTIVE) {
                     hourlyData[hour].productivity += seconds;
                 } else if (data.category === this.categories.DISTRACTING) {
                     hourlyData[hour].productivity -= seconds;
                 }
             });
         }
 
         return hourlyData.filter(data => data.totalTime > 0);
     }
 
     determineActivityType(hostname) {
         return this.defaultCategories[hostname] || this.categories.NEUTRAL;
     }
 
     async updateSiteCategory(hostname, category) {
         if (!Object.values(this.categories).includes(category)) {
             throw new Error('Invalid category');
         }
 
         this.defaultCategories[hostname] = category;
         await chrome.storage.local.set({ 
             customCategories: this.defaultCategories 
         });
     }
 
     async getSiteStats(hostname) {
         const today = new Date().toLocaleDateString();
         return this.siteData[today]?.[hostname] || null;
     }
 
     async getProductivityScore() {
         const insights = await this.getScreenTimeInsights();
         if (insights.totalTime === 0) return 0;
         
         return Math.round((insights.productiveTime / insights.totalTime) * 100);
     }
 }
 
 export default ActivityManager;