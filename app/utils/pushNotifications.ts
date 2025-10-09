// Push Notifications Utility
// Handles browser push notification registration and management

export interface NotificationPermission {
  permission: NotificationPermissionState;
  isSupported: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

export class PushNotificationManager {
  private static instance: PushNotificationManager;
  private registration: ServiceWorkerRegistration | null = null;
  private permissionState: NotificationPermissionState = 'default';

  private constructor() {
    // Only initialize on client-side
    if (typeof window !== 'undefined') {
      this.permissionState = this.getPermissionState();
    }
  }

  public static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager();
    }
    return PushNotificationManager.instance;
  }

  // Check if push notifications are supported
  public isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  // Get current permission state
  public getPermissionState(): NotificationPermissionState {
    if (typeof window === 'undefined' || !this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Get permission info
  public getPermissionInfo(): NotificationPermission {
    return {
      permission: this.getPermissionState(),
      isSupported: this.isSupported(),
    };
  }

  // Request notification permission
  public async requestPermission(): Promise<NotificationPermissionState> {
    if (typeof window === 'undefined' || !this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionState = permission;
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  // Register service worker for push notifications
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (typeof window === 'undefined' || !this.isSupported()) {
      throw new Error('Service workers are not supported in this browser');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration = registration;
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Subscribe to push notifications
  public async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    if (!this.registration) {
      throw new Error('Failed to register service worker');
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY || ''
        ),
      });

      console.log('Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Push subscription removed');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  // Send a local notification
  public async sendNotification(options: PushNotificationOptions): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot send notifications on server-side');
    }
    
    if (this.permissionState !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.png',
        badge: options.badge || '/favicon.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        actions: options.actions,
      });

      // Auto-close notification after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return Promise.resolve();
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Get current subscription
  public async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    if (!this.registration) {
      return null;
    }

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

  // Check if user is subscribed
  public async isSubscribed(): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();
    return subscription !== null;
  }

  // Initialize push notifications
  public async initialize(): Promise<{
    permission: NotificationPermissionState;
    isSubscribed: boolean;
  }> {
    try {
      // Check if supported
      if (!this.isSupported()) {
        return {
          permission: 'denied',
          isSubscribed: false,
        };
      }

      // Register service worker
      await this.registerServiceWorker();

      // Get permission state
      const permission = this.getPermissionState();

      // Check if already subscribed
      const isSubscribed = await this.isSubscribed();

      return {
        permission,
        isSubscribed,
      };
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return {
        permission: 'denied',
        isSubscribed: false,
      };
    }
  }

  // Enable push notifications (request permission and subscribe)
  public async enable(): Promise<{
    success: boolean;
    permission: NotificationPermissionState;
    subscription?: PushSubscription;
  }> {
    try {
      // Request permission
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        return {
          success: false,
          permission,
        };
      }

      // Subscribe to push
      const subscription = await this.subscribeToPush();

      return {
        success: true,
        permission,
        subscription,
      };
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      return {
        success: false,
        permission: this.getPermissionState(),
      };
    }
  }

  // Disable push notifications
  public async disable(): Promise<boolean> {
    try {
      await this.unsubscribeFromPush();
      return true;
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      return false;
    }
  }

  // Convert VAPID key to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (typeof window === 'undefined') {
      throw new Error('Cannot convert VAPID key on server-side');
    }
    
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const pushNotificationManager = PushNotificationManager.getInstance();

// Helper functions
export const requestNotificationPermission = () => pushNotificationManager.requestPermission();
export const sendNotification = (options: PushNotificationOptions) => pushNotificationManager.sendNotification(options);
export const isNotificationSupported = () => pushNotificationManager.isSupported();
export const getNotificationPermission = () => pushNotificationManager.getPermissionInfo();
