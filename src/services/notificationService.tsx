'use client';

interface NotificationOptions {
  title: string;
  message: string;
  icon?: string;
}

export class NotificationService {
  static async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  static async showNotification({ title, message, icon }: NotificationOptions) {
    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body: message,
        icon: icon || '/logo.png',
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }
}