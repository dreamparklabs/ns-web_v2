# Resend Email Setup Guide

This guide explains how to set up Resend for email notifications in the Northstar application.

## 🚀 Quick Setup

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get API Key

1. In the Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Give it a name (e.g., "Northstar Email Notifications")
4. Copy the API key (starts with `re_`)

### 3. Configure Environment Variables

Add the Resend API key to your environment variables:

#### For Local Development (.env.local)
```bash
# Email Notifications (Resend)
RESEND_API_KEY=re_WfRmvFWw_KmaSMZQfvHazPpprbtY2EkMe
```

#### For Convex Backend
1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

### 4. Domain Configuration (Optional)

For production, you'll want to configure a custom domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Follow the DNS configuration steps
4. Update the email templates to use your domain:
   ```typescript
   from: 'Northstar <notifications@yourdomain.com>'
   ```
   
   **Note**: For testing, the application uses `onboarding@resend.dev` which works with any Resend API key.

## 📧 Email Features

### Test Email Functionality

The application includes test email buttons in the Settings → Preferences → Email Notification Preferences section:

- **📚 Test Assignment Email** - Sends a sample assignment reminder
- **📅 Test Event Email** - Sends a sample event reminder  
- **📊 Test Daily Update** - Sends a sample daily summary

**Important**: In testing mode, all test emails are sent to `cameron.mccullough@siu.edu` (the Resend account owner's email) due to Resend's testing restrictions.

### Email Types

1. **Assignment Notifications**
   - Sent when assignments are due soon
   - Purple-themed design
   - Includes assignment details and due dates

2. **Event Notifications**
   - Sent for upcoming classes and events
   - Green-themed design
   - Includes event details and times

3. **Daily Updates**
   - Summary of assignments and events
   - Blue-themed design
   - Includes upcoming items for the week

## 🔧 Technical Details

### Resend API Integration

The application uses Resend's REST API to send emails:

```typescript
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Northstar <onboarding@resend.dev>', // Use your domain in production
    to: [user.email],
    subject: 'Your Subject Here',
    html: '<html>...</html>',
  }),
});
```

### Email Templates

All emails use responsive HTML templates with:
- Mobile-friendly design
- Consistent branding (purple/green/blue themes)
- Clear call-to-action buttons
- Professional styling

### Error Handling

The system includes comprehensive error handling:
- API response validation
- User-friendly error messages
- Console logging for debugging
- Graceful fallbacks

## 🧪 Testing

### Test Email Buttons

1. Go to **Settings** → **Preferences**
2. Scroll to **Email Notification Preferences**
3. Click any test email button
4. Check your inbox for the test email

### Manual Testing

You can also test via the Convex dashboard:
1. Go to **Functions** → **Actions**
2. Find `emailNotifications:sendTestEmail`
3. Run with parameters:
   ```json
   {
     "userId": "your_user_id",
     "emailType": "assignment"
   }
   ```

## 📊 Monitoring

### Resend Dashboard

Monitor email delivery in the Resend dashboard:
- **Activity** - View sent emails
- **Analytics** - Open rates, click rates
- **Logs** - Detailed delivery information

### Application Logs

Check Convex logs for email sending status:
- Success messages
- Error details
- API response codes

## 🔒 Security

### API Key Security

- Never commit API keys to version control
- Use environment variables for all keys
- Rotate keys regularly
- Use different keys for dev/staging/production

### Email Content

- All emails are HTML-escaped
- No user input is directly inserted
- Templates are validated
- Content is sanitized

## 🚨 Troubleshooting

## 🧪 Testing Mode Restrictions

### Resend Testing Mode

When using Resend in testing mode (without a verified domain), there are important restrictions:

1. **Email Recipients**: You can only send emails to the account owner's verified email address
2. **Current Setup**: Test emails are sent to `cameron.mccullough@siu.edu`
3. **Production**: To send to any email address, you need to verify a custom domain

### How to Verify a Domain (Production)

1. Go to [Resend Domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow the DNS configuration steps
5. Update the email templates to use your domain

### Common Issues

**"Failed to send test email"**
- Check RESEND_API_KEY is set correctly
- Verify the API key is valid
- Check Convex environment variables

**"Email not received"**
- Check spam folder
- Verify email address is correct
- Check Resend dashboard for delivery status

**"API key invalid"**
- Regenerate API key in Resend dashboard
- Update environment variables
- Redeploy Convex functions

### Debug Steps

1. Check Convex logs for error messages
2. Verify environment variables are set
3. Test API key in Resend dashboard
4. Check email templates for syntax errors

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Email Best Practices](https://resend.com/docs/guides/email-best-practices)
- [Domain Setup Guide](https://resend.com/docs/guides/domain-setup)

## 🎯 Next Steps

1. **Set up custom domain** for production emails
2. **Configure email templates** with your branding
3. **Set up email analytics** for monitoring
4. **Implement email preferences** for users
5. **Add unsubscribe functionality** for compliance

---

**Need help?** Check the [ENV_VARIABLES.md](./ENV_VARIABLES.md) file for complete environment variable documentation.
