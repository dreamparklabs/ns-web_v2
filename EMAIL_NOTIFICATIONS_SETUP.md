# Email Notifications Setup Guide

## Overview
This guide explains how to set up email notifications using Clerk's email system for assignments, events, and daily updates.

## Features Implemented

### 1. Email Notification Types
- **Assignment Reminders**: Notifications for upcoming assignment due dates
- **Event Reminders**: Notifications for classes and events
- **Daily Updates**: Daily summaries of assignments and events
- **Weekly Digest**: Weekly academic progress summaries
- **Urgent Notifications**: Immediate notifications for urgent updates

### 2. User Preferences
Users can control their email preferences in Settings > Preferences:
- Toggle individual notification types on/off
- Save preferences to database
- Real-time preference updates

## Technical Implementation

### 1. Convex Functions (`convex/emailNotifications.ts`)
- `getUserEmailPreferences`: Get user's email preferences
- `updateUserEmailPreferences`: Update user's email preferences
- `sendAssignmentNotification`: Send assignment reminder emails
- `sendEventNotification`: Send event reminder emails
- `sendDailyUpdates`: Send daily update emails to all users
- `scheduleDailyUpdates`: Cron job endpoint for daily updates

### 2. Email Service (`app/utils/emailService.ts`)
- Email template generation
- HTML and text email formats
- Clerk API integration
- Error handling and timeouts

### 3. UI Components (`app/components/EmailNotificationSettings.tsx`)
- Comprehensive email preference settings
- Real-time preference updates
- Save status feedback
- Reset functionality

## Setup Instructions

### 1. Environment Variables
Add to your `.env` file:
```bash
# Clerk Configuration
CLERK_SECRET_KEY=your_clerk_secret_key
CLIENT_URL=http://localhost:5173  # or your production URL
```

### 2. Clerk Dashboard Setup
1. Go to your Clerk Dashboard
2. Navigate to "Email & SMS" > "Email"
3. Configure your email domain (e.g., `notifications@yourdomain.com`)
4. Set up email templates if needed
5. Verify your domain for email sending

### 3. Database Schema
The following fields have been added to the `users` table:
```typescript
emailPreferences: v.optional(v.object({
  assignments: v.boolean(),
  events: v.boolean(),
  dailyUpdates: v.boolean(),
  weeklyDigest: v.boolean(),
  urgentNotifications: v.boolean(),
})),
primaryEmailAddressId: v.optional(v.string()),
```

### 4. Cron Job Setup (for Daily Updates)

#### Option A: Using Vercel Cron Jobs
Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-email-updates",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Create `app/routes/api.cron.daily-email-updates.tsx`:
```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export async function loader() {
  const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
  
  try {
    await convex.action(api.emailNotifications.scheduleDailyUpdates, {});
    return new Response("Daily updates sent successfully", { status: 200 });
  } catch (error) {
    console.error("Failed to send daily updates:", error);
    return new Response("Failed to send daily updates", { status: 500 });
  }
}
```

#### Option B: Using GitHub Actions
Create `.github/workflows/daily-email-updates.yml`:
```yaml
name: Daily Email Updates
on:
  schedule:
    - cron: '0 8 * * *'  # Run at 8 AM UTC daily

jobs:
  send-daily-updates:
    runs-on: ubuntu-latest
    steps:
      - name: Send Daily Updates
        run: |
          curl -X POST "${{ secrets.CONVEX_URL }}/api/emailNotifications/scheduleDailyUpdates"
```

#### Option C: Using External Cron Service
Use services like:
- **cron-job.org**: Free cron job service
- **EasyCron**: Reliable cron service
- **Cronitor**: Monitoring and cron service

Set up a webhook to call:
```
POST https://your-app.vercel.app/api/cron/daily-email-updates
```

### 5. Manual Testing

#### Test Assignment Notification
```typescript
// In your Convex dashboard or API
await convex.action(api.emailNotifications.sendAssignmentNotification, {
  userId: "user_id_here",
  assignmentId: "assignment_id_here"
});
```

#### Test Event Notification
```typescript
await convex.action(api.emailNotifications.sendEventNotification, {
  userId: "user_id_here",
  eventId: "event_id_here"
});
```

#### Test Daily Updates
```typescript
await convex.action(api.emailNotifications.sendDailyUpdates, {});
```

## Email Templates

### Assignment Reminder Template
- Purple theme with assignment details
- Course information and due date
- Direct link to assignment
- Responsive HTML design

### Event Reminder Template
- Green theme with event details
- Date, time, and location
- Direct link to calendar
- Responsive HTML design

### Daily Update Template
- Blue theme with summary cards
- Today's assignments and events
- Upcoming assignments and events
- Direct link to dashboard

## User Experience

### Settings Interface
- Located in Settings > Preferences
- Toggle switches for each notification type
- Save/Reset buttons with status feedback
- Information panel explaining Clerk integration

### Email Delivery
- Uses Clerk's secure email system
- Professional HTML templates
- Fallback text versions
- Mobile-responsive design

## Monitoring and Analytics

### Success Tracking
- Console logs for successful sends
- Error logging for failed attempts
- User preference tracking

### Performance Considerations
- Batch processing for daily updates
- Timeout protection for API calls
- Error handling for missing users/assignments

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check Clerk secret key configuration
   - Verify email domain setup in Clerk
   - Check user email preferences

2. **Template rendering issues**
   - Verify HTML template syntax
   - Check for missing environment variables
   - Test with simple text emails first

3. **Cron job not running**
   - Verify cron job configuration
   - Check webhook endpoint accessibility
   - Monitor logs for errors

### Debug Commands
```bash
# Test email service locally
npm run dev

# Check Convex functions
npx convex dev

# Monitor logs
npx convex logs
```

## Future Enhancements

### Planned Features
- Email template customization
- Notification frequency settings
- Digest scheduling options
- Email analytics and tracking
- A/B testing for email content

### Integration Opportunities
- Calendar integration (Google, Outlook)
- LMS integration (Canvas, Blackboard)
- Social media notifications
- SMS notifications via Clerk

## Security Considerations

### Data Protection
- User email preferences encrypted
- Clerk handles email delivery securely
- No sensitive data in email templates
- GDPR compliance for email preferences

### Rate Limiting
- Clerk handles rate limiting
- Batch processing for bulk emails
- User preference respect
- Opt-out functionality

This email notification system provides a comprehensive solution for keeping users informed about their academic activities while respecting their preferences and privacy.



