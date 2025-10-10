# Convex Environment Variables Setup

## 🚀 Quick Setup for Email Notifications

To enable email notifications with Resend, you need to add the API key to your Convex environment variables.

### 1. Get Your Resend API Key

You already have your Resend API key: `re_WfRmvFWw_KmaSMZQfvHazPpprbtY2EkMe`

### 2. Add to Convex Environment Variables

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add Variable**
5. Add:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_WfRmvFWw_KmaSMZQfvHazPpprbtY2EkMe`
6. Click **Save**

### 3. Redeploy Convex Functions

After adding the environment variable, you need to redeploy your Convex functions:

```bash
npx convex deploy
```

### 4. Test Email Functionality

1. Go to your application
2. Navigate to **Settings** → **Preferences**
3. Scroll to **Email Notification Preferences**
4. Click any test email button:
   - 📚 Test Assignment Email
   - 📅 Test Event Email
   - 📊 Test Daily Update

### 5. Check Your Inbox

The test emails should now be delivered successfully to your email address!

## 🔧 Troubleshooting

**If emails still fail:**
1. Verify the API key is correctly set in Convex dashboard
2. Check that you've run `npx convex deploy` after adding the variable
3. Ensure the API key is valid and active in your Resend dashboard

**Common Issues:**
- **403 Not Authorized**: API key not set or invalid
- **Domain not authorized**: Using wrong from address (should be `onboarding@resend.dev` for testing)
- **Function not found**: Need to redeploy Convex functions

## 📧 Email Configuration

The application is configured to use:
- **From Address**: `Northstar <onboarding@resend.dev>` (for testing)
- **API Endpoint**: `https://api.resend.com/emails`
- **Authentication**: Bearer token with your API key

For production, you'll want to set up a custom domain in Resend and update the from addresses accordingly.

---

**Need help?** Check the [RESEND_EMAIL_SETUP.md](./RESEND_EMAIL_SETUP.md) file for complete setup instructions.


