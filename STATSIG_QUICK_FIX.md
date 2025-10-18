# Statsig Quick Fix - Get Events Logging Now! 

## 🔴 The Problem

Your Statsig events log stream is empty because **the Statsig Client SDK key is missing** from your environment variables.

## ✅ The Solution (5 Minutes)

### Step 1: Get Your Statsig Client API Key

1. **Open Statsig Console**: https://console.statsig.com/5qgVyBdH7o4gKy4vfe0gJs
2. **Click Settings** (gear icon) in the left sidebar
3. **Go to API Keys** tab
4. **Copy the "Client API Key"** - it starts with `client-`
   - Example: `client-lCxw5HhhqHFbmP6UUwT1Fs5WJvXOJtAyxkgh4pVVvye`

### Step 2: Add to Environment File

1. **Open or create** `.env.local` in your project root:
   ```bash
   cd /Users/campeete/ns-web
   touch .env.local  # If it doesn't exist
   ```

2. **Add this line** to `.env.local`:
   ```bash
   VITE_STATSIG_CLIENT_KEY=client-paste_your_actual_key_here
   ```

3. **Save the file**

💡 **Tip:** Use the `env.template` file I just created as a reference for all environment variables!

### Step 3: Restart Your Dev Server

```bash
# In your terminal, stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Verify It's Working

1. **Open your app** in the browser
2. **Open browser console** (F12 or Cmd+Option+I)
3. **Look for this log**:
   ```
   🔍 Statsig Client Key Status: {
     hasKey: true,
     keyPreview: "client-lCxw5HhhqHF..."
   }
   ```

4. **Navigate around your app** - interact with features
5. **Go back to Statsig Console** → Metrics → Events
6. **Wait 30-60 seconds** - events should start appearing!

---

## 🎯 What I Fixed in Your Code

✅ **Standardized environment variable name** to `VITE_STATSIG_CLIENT_KEY` across all files:
- `app/root.tsx`
- `app/entry.client.tsx`
- `app/entry.server.tsx`
- `app/welcome/welcome.tsx`
- `app/components/AppLayout.tsx`
- `app/utils/statsigClient.ts`

✅ **Updated documentation**:
- Added Statsig to `ENV_VARIABLES.md`
- Updated `STATSIG_SETUP_GUIDE.md` with Step 0
- Created `env.template` file

✅ **Autocapture plugin is already installed** - events will log automatically once the key is configured!

---

## 🔍 Troubleshooting

### Still no events after 5 minutes?

**Check 1: SDK Key Status**
```javascript
// In browser console
console.log(import.meta.env.VITE_STATSIG_CLIENT_KEY)
// Should show: "client-your_key"
// If undefined: key not in .env.local or server not restarted
```

**Check 2: Statsig Client Initialization**
```javascript
// Look for this in console
🔍 Statsig Client Status: { clientExists: true }
```

**Check 3: User ID**
```javascript
// Should see your real Clerk user ID, not 'anonymous'
🔍 StatsigShell Debug: {
  clerkUserId: "user_xxxxx...",
  userPlan: "northstar_basic" or "northstar_pro"
}
```

**Check 4: Network Tab**
- Open DevTools → Network tab
- Filter by "statsig"
- You should see API calls to `https://featuregates.org` or `https://events.statsigapi.net`
- If no calls: SDK key is missing or invalid

### "hasKey: false" in Console

→ **Solution:** Your `.env.local` file doesn't have the key, or you didn't restart the dev server

### "Client API Key" not showing in Statsig Console

→ **Solution:** You might be looking at "Server Secret Key" instead
   - Look for "Client-Side" or "Client API Key" section
   - It should explicitly say it's safe to use in browsers
   - Starts with `client-` not `secret-`

### Events still not appearing after 10+ minutes

→ **Solution:** Check Statsig environment (Production vs Development)
   - Top-right corner of Statsig Console
   - Should be "Development" (non-production)
   - Toggle "Show non-production logs" on the Events page

---

## 📊 How to Verify Events Are Logging

### Manual Event Test

In your browser console:
```javascript
// Import the hook (if you're on a page that uses it)
const { logEvent } = useStatsig();
logEvent('test_event', 'test_value', { source: 'manual_test' });
```

### Check Statsig Console

1. Go to: https://console.statsig.com/5qgVyBdH7o4gKy4vfe0gJs/metrics/events
2. Toggle **"Show non-production logs"** ON (blue toggle)
3. Wait 30-60 seconds for events to appear
4. You should see:
   - User pageviews (from autocapture)
   - Click events (from autocapture)
   - Your custom feature usage events

---

## 🎉 Success Checklist

- [ ] Statsig Client API Key copied from console
- [ ] `VITE_STATSIG_CLIENT_KEY` added to `.env.local`
- [ ] Dev server restarted
- [ ] Browser console shows `hasKey: true`
- [ ] Browser console shows `clerkUserId: "user_xxxxx"`
- [ ] Network tab shows calls to Statsig API
- [ ] Events appearing in Statsig Console (wait 1-2 minutes)

---

## 📚 Next Steps After This Works

Once events are logging:

1. ✅ **Verify Feature Gates** - Follow `STATSIG_SETUP_GUIDE.md` to create all 12 gates
2. ✅ **Test Feature Gating** - Use the `useFeatureGate()` hook in your components
3. ✅ **Set Up Dashboards** - Create Statsig dashboards for monitoring
4. ✅ **Configure Alerts** - Set up alerts for important metrics

---

## 🆘 Still Stuck?

If you're still not seeing events after following this guide:

1. **Share your console logs** - Look for any Statsig-related errors
2. **Check `.env.local` exists** - Run: `ls -la .env.local`
3. **Verify key format** - Should start with `client-` and be ~40-50 characters
4. **Try incognito mode** - Rules out browser cache issues
5. **Check Statsig status** - https://status.statsig.com

---

**Created:** October 17, 2025
**Issue:** No events in Statsig log stream
**Root Cause:** Missing `VITE_STATSIG_CLIENT_KEY` environment variable
**Time to Fix:** ~5 minutes

