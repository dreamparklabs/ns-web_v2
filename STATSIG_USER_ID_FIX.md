# Statsig User ID Fix - COMPLETE

## 🎯 Problem Identified

You were seeing `'default-user'` and `'anonymous'` in Statsig instead of real Clerk user IDs because there were **MULTIPLE StatsigProvider components** throughout your codebase, each initializing with hardcoded fallback user IDs.

## 🔧 What Was Fixed

### Removed Duplicate StatsigProviders

**Before:** 5 different places initializing Statsig with hardcoded user IDs
**After:** 1 centralized StatsigProvider in `root.tsx` that correctly uses Clerk user IDs

### Files Fixed:

1. ✅ **`app/entry.client.tsx`**
   - Removed: `<StatsigProvider user={{ userID: "default-user" }}>`
   - Reason: This was wrapping the hydration and overriding the correct user ID

2. ✅ **`app/entry.server.tsx`**
   - Removed: `<StatsigProvider user={{ userID: "default-user" }}>`
   - Reason: This was wrapping server-side rendering with wrong user ID

3. ✅ **`app/welcome/welcome.tsx`**
   - Removed: `<StatsigProvider user={{ userID: "default-user" }}>`
   - Reason: Duplicate provider in welcome page component

4. ✅ **`app/components/AppLayout.tsx`**
   - Removed: `<StatsigProvider user={{ userID: user?.id || "default-user" }}>`
   - Reason: Duplicate provider in main layout (even though this one tried to use user ID, it still fell back to "default-user")

### ✅ What's Correct Now

**`app/root.tsx` - The ONLY Place with StatsigProvider:**

```tsx
function StatsigShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId, isSignedIn } = useAuth();
  const { convexUser, user } = useUserSetup();

  // Get the actual Clerk user ID
  const clerkUserId = userId || user?.id;

  // Get user's plan from Clerk
  const subscription = user?.publicMetadata?.subscription as any;
  const userPlan = subscription?.plan || 'free_user';

  // Build user properties for Statsig
  const userProperties = clerkUserId ? {
    email: user?.emailAddresses?.[0]?.emailAddress,
    firstName: user?.firstName,
    lastName: user?.lastName,
    clerkUserId: clerkUserId,
    convexUserId: convexUser?._id,
    custom: {
      plan: userPlan,  // ← Available for feature gates!
    }
  } : {};

  const { client } = useClientAsyncInit(
    import.meta.env.VITE_STATSIG_CLIENT_KEY,
    clerkUserId ? {
      userID: clerkUserId,  // ← Real Clerk user ID!
      ...userProperties
    } : {
      userID: 'anonymous',  // ← Only when truly not signed in
    },
    { 
      plugins: [
        new StatsigAutoCapturePlugin(), 
        new StatsigSessionReplayPlugin()
      ] 
    }
  );

  return (
    <StatsigProvider client={client}>
      {children}
    </StatsigProvider>
  );
}
```

## 🚀 Testing Instructions

### Step 1: Restart Your Dev Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 2: Clear Browser Cache

```bash
# Option 1: Hard refresh
# Mac: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + R

# Option 2: Use incognito/private mode
# This ensures a fresh start with no cached Statsig data
```

### Step 3: Sign In to Your App

1. Open your app in the browser
2. **Sign in with your Clerk account** (not anonymous)
3. Navigate around the app for 30-60 seconds

### Step 4: Verify User ID in Console

Open browser console (F12) and look for:

```
🔍 StatsigShell Debug: {
  clerkUserId: "user_xxxxxxxxxxxxx",  // ← Should be your REAL Clerk user ID
  userPlan: "northstar_basic" or "northstar_pro",
  willInitializeStatsig: true
}
```

**❌ BAD (Old):**
```
clerkUserId: "default-user"  // Wrong!
clerkUserId: "anonymous"     // Only OK if not signed in
```

**✅ GOOD (New):**
```
clerkUserId: "user_2e5d8ca6..."  // Real Clerk user ID!
```

### Step 5: Check Statsig Console

1. Go to: https://console.statsig.com/5qgVyBdH7o4gKy4vfe0gJs/users
2. Wait 1-2 minutes for data to sync
3. You should now see your **REAL Clerk user ID** like:
   - `user_2e5d8ca6...` (your actual ID)
   - NOT `default-user` or `anonymous`

4. Go to: https://console.statsig.com/5qgVyBdH7o4gKy4vfe0gJs/metrics/events
5. Toggle **"Show non-production logs"** ON
6. You should see events logged with your real user ID

## 🎉 Expected Results

### User Page in Statsig

**Before:**
```
| User ID        | Email | Last Seen           |
|----------------|-------|---------------------|
| default-user   | -     | Oct 17, 2025 12:42  |
| anonymous      | -     | Oct 17, 2025 12:32  |
```

**After:**
```
| User ID              | Email            | Last Seen           |
|----------------------|------------------|---------------------|
| user_2e5d8ca6...     | you@email.com    | Oct 17, 2025 12:45  |
```

### Events Page in Statsig

You should now see:
- ✅ Pageview events with your real user ID
- ✅ Click events from autocapture
- ✅ Feature usage events with proper user attribution
- ✅ User properties populated (email, name, plan)

## 🔍 Troubleshooting

### Still Seeing "anonymous"?

→ **Solution:** You're not signed in. Sign in with Clerk first.

### Still Seeing "default-user"?

→ **Solution:** 
1. Make sure you restarted your dev server
2. Clear browser cache completely
3. Check you're on the latest code (pull from git if needed)
4. Verify no other files have StatsigProvider:
   ```bash
   grep -r "StatsigProvider" app/
   # Should ONLY show app/root.tsx
   ```

### User ID shows but no plan?

→ **Solution:** Set your plan in Clerk Dashboard:
1. Go to: https://dashboard.clerk.com → Users
2. Click your user → Metadata tab
3. Add to Public Metadata:
   ```json
   {
     "subscription": {
       "plan": "northstar_basic",
       "status": "active"
     }
   }
   ```

### Events not showing?

→ **Solution:** 
1. Verify `VITE_STATSIG_CLIENT_KEY` is in `.env.local`
2. Console should show: `hasKey: true`
3. Wait 2-3 minutes - events aren't instant
4. Toggle "Show non-production logs" in Statsig Console

## 📊 Benefits of This Fix

### Before (Multiple Providers):
❌ Inconsistent user tracking
❌ Generic "default-user" for all users
❌ No user attribution for events
❌ Can't segment by user properties
❌ Feature gates couldn't target specific users
❌ Multiple Statsig instances conflicting

### After (Single Provider):
✅ Consistent user tracking with real Clerk IDs
✅ Full user attribution for all events
✅ Can segment users by plan, email, etc.
✅ Feature gates work correctly with user.custom.plan
✅ Session replay tied to real users
✅ One source of truth for Statsig initialization

## 🎯 Next Steps

Once you verify your real user ID is showing in Statsig:

1. ✅ **Test Feature Gates** - Create a test gate and verify it works
2. ✅ **Check Session Replay** - Your sessions should be attributed correctly
3. ✅ **Monitor Events** - Events should show with proper user context
4. ✅ **Set Up Dashboards** - Follow `STATSIG_SETUP_GUIDE.md`

## 📝 Architecture Note

**Why One Provider in root.tsx?**

Having a single StatsigProvider at the app root ensures:
1. **Single source of truth** - One place to manage user identity
2. **Consistent state** - All components use the same Statsig instance
3. **Better performance** - No duplicate SDK initialization
4. **Easier debugging** - One place to add logs and track issues
5. **React Context best practice** - Providers should wrap the entire app tree

This is the recommended pattern from [Statsig React SDK docs](https://docs.statsig.com/client/javascript-sdk).

---

**Fixed:** October 17, 2025
**Issue:** Multiple StatsigProvider instances with hardcoded user IDs
**Solution:** Centralized to single provider in root.tsx with dynamic Clerk user ID
**Files Changed:** 4 (entry.client.tsx, entry.server.tsx, welcome.tsx, AppLayout.tsx)

