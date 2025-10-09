# Push Notifications Setup Guide

This guide explains how to set up and use browser push notifications in the Northstar application.

## 🚀 Overview

The push notification system allows users to receive real-time notifications in their browser, even when the application is not actively open. This includes:

- **Permission Management**: Request and manage notification permissions
- **Service Worker**: Handle background notification delivery
- **Subscription Management**: Subscribe/unsubscribe from push notifications
- **Test Notifications**: Send test notifications to verify functionality
- **Error Handling**: Comprehensive error handling and user feedback

## 📋 Prerequisites

1. **VAPID Keys**: Voluntarily Application Server Identification keys for secure push notifications
2. **HTTPS**: Push notifications require HTTPS in production
3. **Service Worker Support**: Modern browser with service worker support

## 🔧 Setup Instructions

### 1. Generate VAPID Keys

Install the web-push package and generate VAPID keys:

```bash
npm install -g web-push
npx web-push generate-vapid-keys
```

This will output something like:
```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa40HI2p9i7qgUcN5M0c8w2o8K2X5y9Z8Q1W3E4R5T6Y7U8I9O0P

Private Key:
4L3l5r8Q1W3E4R5T6Y7U8I9O0P2A3S4D5F6G7H8J9K0L1M2N3B4V5C6X7Z8A9S0D1F2G3H4J5K6L7M8N9B0V

=======================================
```

### 2. Add Environment Variables

Add the VAPID keys to your `.env.local` file:

```bash
# Push Notifications (VAPID Keys)
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI2p9i7qgUcN5M0c8w2o8K2X5y9Z8Q1W3E4R5T6Y7U8I9O0P
VITE_VAPID_PRIVATE_KEY=4L3l5r8Q1W3E4R5T6Y7U8I9O0P2A3S4D5F6G7H8J9K0L1M2N3B4V5C6X7Z8A9S0D1F2G3H4J5K6L7M8N9B0V
```

### 3. Install Dependencies

The push notification system uses the following packages (already included):

```bash
# No additional dependencies needed - uses native browser APIs
```

## 🏗️ Architecture

### Components

1. **PushNotificationManager** (`app/utils/pushNotifications.ts`)
   - Singleton class for managing push notifications
   - Handles permission requests, subscriptions, and notifications
   - Service worker registration and management

2. **usePushNotifications Hook** (`app/hooks/usePushNotifications.ts`)
   - React hook for push notification state management
   - Provides easy-to-use interface for components
   - Handles loading states and error management

3. **PushNotificationSettings Component** (`app/components/PushNotificationSettings.tsx`)
   - UI component for push notification settings
   - Permission status display
   - Enable/disable functionality
   - Test notification button

4. **Service Worker** (`public/sw.js`)
   - Handles push events and notification display
   - Manages notification clicks and interactions
   - Background sync capabilities

5. **API Route** (`app/routes/api.push.subscribe.tsx`)
   - Handles push subscription storage
   - Server-side subscription management

### Data Flow

```
User Interaction → usePushNotifications Hook → PushNotificationManager → Browser APIs → Service Worker → Notification Display
```

## 🎯 Usage

### In Components

```typescript
import { usePushNotifications } from '../hooks/usePushNotifications';

function MyComponent() {
  const { state, enable, disable, sendTestNotification } = usePushNotifications();

  const handleToggle = async () => {
    if (state.isEnabled) {
      await disable();
    } else {
      await enable();
    }
  };

  return (
    <div>
      <button onClick={handleToggle}>
        {state.isEnabled ? 'Disable' : 'Enable'} Notifications
      </button>
      {state.isEnabled && (
        <button onClick={sendTestNotification}>
          Send Test Notification
        </button>
      )}
    </div>
  );
}
```

### Direct API Usage

```typescript
import { pushNotificationManager } from '../utils/pushNotifications';

// Request permission
const permission = await pushNotificationManager.requestPermission();

// Enable notifications
const result = await pushNotificationManager.enable();

// Send notification
await pushNotificationManager.sendNotification({
  title: 'Hello!',
  body: 'This is a test notification',
  icon: '/favicon.png'
});
```

## 🔒 Security Considerations

1. **VAPID Keys**: Keep private keys secure and never expose them in client-side code
2. **HTTPS Required**: Push notifications only work over HTTPS in production
3. **Permission Handling**: Always respect user permission choices
4. **Subscription Validation**: Validate push subscriptions server-side

## 🌐 Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Complete support |
| Firefox | ✅ Full | Complete support |
| Safari | ✅ Full | iOS 16.4+ / macOS 13+ |
| Edge | ✅ Full | Complete support |
| Opera | ✅ Full | Complete support |

## 🐛 Troubleshooting

### Common Issues

1. **"Push notifications are not supported"**
   - Ensure you're using HTTPS (required for production)
   - Check browser compatibility
   - Verify service worker registration

2. **"Permission denied"**
   - User has blocked notifications in browser settings
   - Clear browser data and try again
   - Check browser notification settings

3. **"Service Worker registration failed"**
   - Check if `sw.js` file exists in `public/` directory
   - Verify file permissions
   - Check browser console for errors

4. **"VAPID key error"**
   - Ensure VAPID keys are properly set in environment variables
   - Verify key format (base64 encoded)
   - Regenerate keys if needed

### Debug Steps

1. **Check Browser Console**: Look for JavaScript errors
2. **Verify Service Worker**: Check Application tab in DevTools
3. **Test Permissions**: Use browser's notification settings
4. **Validate VAPID Keys**: Ensure keys are correctly formatted

## 📊 Testing

### Manual Testing

1. **Enable Notifications**: Toggle the setting in Preferences
2. **Test Permission**: Verify permission dialog appears
3. **Send Test Notification**: Use the test button
4. **Check Background**: Close tab and send notification

### Automated Testing

```typescript
// Example test for push notifications
describe('Push Notifications', () => {
  it('should request permission when enabled', async () => {
    const { result } = renderHook(() => usePushNotifications());
    
    await act(async () => {
      await result.current.enable();
    });
    
    expect(result.current.state.permission).toBe('granted');
  });
});
```

## 🚀 Production Deployment

### Checklist

- [ ] VAPID keys configured in production environment
- [ ] HTTPS enabled for the application
- [ ] Service worker file deployed to `public/sw.js`
- [ ] Push subscription endpoint working
- [ ] Error handling and logging configured
- [ ] Analytics tracking implemented (optional)

### Environment Variables

Ensure these are set in your production environment:

```bash
VITE_VAPID_PUBLIC_KEY=your_production_vapid_public_key
VITE_VAPID_PRIVATE_KEY=your_production_vapid_private_key
```

## 📈 Analytics & Monitoring

Consider implementing:

1. **Permission Grant Rate**: Track how many users enable notifications
2. **Notification Click Rate**: Monitor engagement with notifications
3. **Error Tracking**: Log permission failures and subscription errors
4. **Performance Metrics**: Monitor service worker performance

## 🔄 Future Enhancements

Potential improvements:

1. **Rich Notifications**: Add images, actions, and custom layouts
2. **Notification Scheduling**: Send notifications at specific times
3. **User Segmentation**: Target specific user groups
4. **A/B Testing**: Test different notification strategies
5. **Analytics Integration**: Connect with PostHog or other analytics tools

## 📚 Additional Resources

- [MDN Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
- [Service Workers Guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

