// extension-src/managers/NotificationManager.js

export class NotificationManager {
     constructor() {
         this.notificationQueue = [];
         this.soundEnabled = true;
         this.notificationTypes = {
             TIMER_COMPLETE: 'timer_complete',
             BREAK_REMINDER: 'break_reminder',
             STREAK_ACHIEVEMENT: 'streak_achievement',
             PRODUCTIVITY_ALERT: 'productivity_alert',
             BLOCKING_NOTIFICATION: 'blocking_notification'
         };
         this.sounds = {
             timer_complete: 'timer-complete.mp3',
             break_reminder: 'break-reminder.mp3',
             achievement: 'achievement.mp3',
             alert: 'alert.mp3'
         };
     }
 
     static getInstance() {
         if (!NotificationManager.instance) {
             NotificationManager.instance = new NotificationManager();
         }
         return NotificationManager.instance;
     }
 
     async initialize() {
         await this.loadSettings();
         this.setupNotificationHandlers();
         await this.requestPermission();
     }
 
     async loadSettings() {
         const settings = await chrome.storage.local.get(['notificationSettings']);
         this.soundEnabled = settings.notificationSettings?.soundEnabled ?? true;
         
         // Load any custom notification settings
         if (settings.notificationSettings) {
             this.customSettings = settings.notificationSettings;
         }
     }
 
     async requestPermission() {
         if (Notification.permission !== 'granted') {
             try {
                 const permission = await Notification.requestPermission();
                 return permission === 'granted';
             } catch (error) {
                 console.error('Failed to request notification permission:', error);
                 return false;
             }
         }
         return true;
     }
 
     setupNotificationHandlers() {
         chrome.notifications.onClicked.addListener((notificationId) => {
             this.handleNotificationClick(notificationId);
         });
 
         chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
             this.handleNotificationButtonClick(notificationId, buttonIndex);
         });
 
         // Listen for messages from other managers
         chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
             if (message.type === 'notification') {
                 this.showNotification(message.data);
                 sendResponse({ success: true });
             }
         });
     }
 
     async showNotification(options) {
         if (!await this.requestPermission()) return;
 
         const baseOptions = {
             type: 'basic',
             iconUrl: '/icons/icon48.png',
             priority: 1
         };
 
         const notificationOptions = {
             ...baseOptions,
             ...options
         };
 
         try {
             await chrome.notifications.create(options.id || crypto.randomUUID(), notificationOptions);
             if (this.soundEnabled && options.sound) {
                 await this.playSound(options.sound);
             }
         } catch (error) {
             console.error('Failed to show notification:', error);
         }
     }
 
     async playSound(soundKey) {
         if (!this.soundEnabled) return;
 
         const audio = new Audio(chrome.runtime.getURL(`sounds/${this.sounds[soundKey]}`));
         try {
             await audio.play();
         } catch (error) {
             console.error('Failed to play notification sound:', error);
         }
     }
 
     async showTimerComplete(duration, type) {
         const messages = {
             focus: `Great job! You completed ${duration} minutes of focused work.`,
             break: `Break time is over! Ready to get back to work?`
         };
 
         await this.showNotification({
             title: 'Timer Complete',
             message: messages[type],
             type: 'basic',
             buttons: [{
                 title: type === 'focus' ? 'Take a Break' : 'Start Focus Session'
             }],
             sound: 'timer_complete'
         });
     }
 
     async showBreakReminder(timeLeft) {
         await this.showNotification({
             title: 'Break Coming Up',
             message: `${timeLeft} minutes until your next break. Keep going!`,
             type: 'basic',
             sound: 'break_reminder'
         });
     }
 
     async showStreakAchievement(streak) {
         const milestoneMessages = {
             5: "You're on fire! 5 day streak!",
             10: "Double digits! 10 day streak!",
             30: "Unstoppable! 30 day streak!"
         };
 
         if (milestoneMessages[streak]) {
             await this.showNotification({
                 title: 'Streak Achievement',
                 message: milestoneMessages[streak],
                 type: 'basic',
                 sound: 'achievement'
             });
         }
     }
 
     async showProductivityAlert(score, trend) {
         if (score < 30) {
             await this.showNotification({
                 title: 'Productivity Alert',
                 message: 'Your productivity score is low. Need help focusing?',
                 type: 'basic',
                 buttons: [{
                     title: 'Start Focus Session'
                 }],
                 sound: 'alert'
             });
         }
     }
 
     async showBlockingNotification(site) {
         await this.showNotification({
             title: 'Site Blocked',
             message: `${site} is blocked during focus time.`,
             type: 'basic',
             buttons: [{
                 title: 'Allow for 5 minutes'
             }, {
                 title: 'Settings'
             }],
             sound: 'alert'
         });
     }
 
     async handleNotificationClick(notificationId) {
         // Handle notification clicks based on notification type
         const notification = await chrome.notifications.get(notificationId);
         if (notification) {
             chrome.runtime.sendMessage({
                 action: 'notificationClicked',
                 notificationId: notificationId,
                 type: notification.type
             });
         }
     }
 
     async handleNotificationButtonClick(notificationId, buttonIndex) {
         const notification = await chrome.notifications.get(notificationId);
         if (notification) {
             chrome.runtime.sendMessage({
                 action: 'notificationButtonClicked',
                 notificationId: notificationId,
                 buttonIndex: buttonIndex,
                 type: notification.type
             });
         }
     }
 
     async updateSettings(settings) {
         this.soundEnabled = settings.soundEnabled;
         await chrome.storage.local.set({
             notificationSettings: settings
         });
     }
 
     async clearAllNotifications() {
         await chrome.notifications.getAll((notifications) => {
             for (const notificationId in notifications) {
                 chrome.notifications.clear(notificationId);
             }
         });
     }
 }
 
 export default NotificationManager;