# Statsig Gate Fix - Setup Instructions

## Problems Identified

The `ai_ocr_enabled` gate (and all other gates) were failing due to TWO critical issues:

### Issue 1: User ID was not being passed correctly
- **Statsig was receiving generic IDs** like `'a-user'`, `'anonymous'`, or `'default-user'` instead of the real Clerk user ID
- This meant Statsig couldn't properly identify users or apply targeting rules
- The app was using fallback IDs before waiting for the actual user data to load

### Issue 2: Plan property was missing
- **The `plan` property was not being passed to Statsig** when initializing the client
- Your app was initializing Statsig with user data but missing the crucial `plan` field
- Statsig gates were checking for `user.plan`, but it was never being sent

## What Was Fixed

### 1. Fixed User ID passing (app/root.tsx)
- **Changed:** Now waits for actual Clerk user ID before initializing Statsig
- **Changed:** Uses `userId` or `user?.id` directly from Clerk (the real Clerk user ID)
- **Removed:** Fallback to `'a-user'` or empty strings
- **Added:** Proper loading states while waiting for user data
- **Result:** Statsig now receives the real Clerk user ID (e.g., `user_33BDQFCFvYGvpTXqGunppiewTKh`)

### 2. Added plan property (app/root.tsx)
- **Added:** Code to extract user's plan from Clerk's `publicMetadata.subscription.plan`
- **Added:** Plan to Statsig's `custom` properties during initialization
- **Result:** Plan is now available as `user.custom.plan` in Statsig

### 3. Updated StatsigUserBinder (app/components/StatsigUserBinder.tsx)
- **Fixed:** Now only updates when real Clerk user ID exists
- **Added:** Plan extraction logic
- **Added:** More detailed logging for debugging
- **Result:** Updates Statsig user with correct ID and plan when subscription changes

## Next Steps: Update Your Statsig Gates

You need to update **ALL 12 feature gates** in the Statsig Console to check for `user.custom.plan` instead of `user.plan`.

### Go to Statsig Console

1. Visit: https://console.statsig.com
2. Navigate to **Feature Gates**
3. For **each gate**, update the targeting rules:

### Update Each Gate's Targeting Rules

#### For Basic + Pro Features (5 gates)
Update these gates:
- `file_storage_enabled`
- `dashboards_enabled`
- `smart_search_enabled`
- `ai_ocr_enabled` ← The one you were testing
- `assignment_management_enabled`

**Old Rule:**
```
Rule 1: If user.plan is any of ["northstar_basic", "northstar_pro"] → Pass
```

**New Rule:**
```
Rule 1: If user.custom.plan is any of ["northstar_basic", "northstar_pro"] → Pass
```

#### For Pro-Only Features (7 gates)
Update these gates:
- `academic_analytics_enabled`
- `homework_help_enabled`
- `study_buddy_enabled`
- `calendar_sync_enabled`
- `storage_share_enabled`
- `unlimited_storage_enabled`
- `unlimited_dashboards_enabled`

**Old Rule:**
```
Rule 1: If user.plan equals "northstar_pro" → Pass
```

**New Rule:**
```
Rule 1: If user.custom.plan equals "northstar_pro" → Pass
```

### How to Update a Gate in Statsig Console

1. Click on the gate name (e.g., `ai_ocr_enabled`)
2. Go to the **Targeting** tab
3. Find the rule that checks `user.plan`
4. Click **Edit Rule**
5. Change the field from `user.plan` to `user.custom.plan`
6. Click **Save Rule**
7. Click **Enable** if the gate is disabled
8. Repeat for all 12 gates

## Testing Instructions

### 1. Restart Your Development Server
```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### 2. Set Up a Test Plan

First, you need to give your user a plan. Choose one of these methods:

#### Option A: Sync from Stripe (If you have a real subscription)
1. Log into your app
2. Open Settings → Billing
3. Click "Sync Subscription"
4. Check the console logs to verify your plan

#### Option B: Manually Set Plan via Clerk Dashboard
1. Go to https://dashboard.clerk.com
2. Navigate to **Users**
3. Find your test user
4. Click on the user
5. Go to **Metadata** tab
6. Add to **Public Metadata**:
```json
{
  "subscription": {
    "plan": "northstar_basic",
    "status": "active"
  }
}
```
7. Save

#### Option C: Test with Statsig Checkgate (Quick Test)
Use the Statsig checkgate tool with the corrected user object:

```javascript
const apiKey = 'client-lCxw5HhhqHFbmP6UUwT1Fs5WJvXOJtAyxkgh4pVVvye';
await statsig.initialize(apiKey, { 
  userID: "user_33BDQFCFvYGvpTXqGunppiewTKh",
  custom: {
    plan: "northstar_basic"  // ← NOW INCLUDING THIS IN custom OBJECT
  }
});
const status = statsig.checkGate('ai_ocr_enabled');
$d('result').innerText = (status ? 'Passed' : 'Failed');
```

### 3. Verify in Your App

After restarting and setting a plan:

1. Open your browser console
2. Look for the debug log: `🔍 StatsigShell Debug:`
3. **CRITICAL:** Verify the output shows:
   ```
   clerkUserId: "user_xxxxxxxxxxxxx"  // ← Should be your REAL Clerk user ID, NOT 'a-user' or 'anonymous'
   userPlan: "northstar_basic" (or "northstar_pro")
   subscription: "northstar_basic"
   willInitializeStatsig: true
   ```

4. If you see `clerkUserId: "a-user"` or `anonymous`, something is wrong with Clerk authentication

5. Look for the StatsigUserBinder log: `🔍 StatsigUserBinder: Updating Statsig user:`
   ```
   clerkUserId: "user_xxxxxxxxxxxxx"  // ← Again, should be your REAL ID
   userPlan: "northstar_basic"
   email: "your@email.com"
   ```

6. Test a feature gate:
```javascript
// In browser console
const { checkAccess } = useFeatureGate();
console.log(checkAccess('ai_powered_ocr'));
// Should return: { hasAccess: true, requiresUpgrade: false }
```

### 4. Test the Checkgate Again

After updating the Statsig gates:

1. Go back to the checkgate interface
2. Run the test with `user.custom.plan` set
3. The gate should now **Pass** ✅

## Verification Checklist

- [ ] All 12 gates updated in Statsig Console to check `user.custom.plan`
- [ ] Development server restarted completely
- [ ] Browser cache cleared
- [ ] **User ID verification:** Console logs show `clerkUserId` is your REAL Clerk user ID (not 'a-user' or 'anonymous')
- [ ] **Plan verification:** Console logs show `userPlan` is not null/undefined
- [ ] User has a plan set (via Clerk metadata or real subscription)
- [ ] Feature gates return `hasAccess: true` for features in your plan
- [ ] Checkgate test passes in Statsig console
- [ ] Events in Statsig Console show up under your real Clerk user ID

## Troubleshooting

### Gate Still Failing?

**Check 1: User ID is correct (MOST IMPORTANT!)**
- Open browser console
- Look for: `🔍 StatsigShell Debug:`
- Verify `clerkUserId` shows your REAL Clerk user ID like `user_xxxxxxxxxxxxx`
- If you see `'a-user'`, `'anonymous'`, `null`, or `undefined`, the fix didn't work
- **Solution:** Make sure you restarted the dev server and cleared browser cache

**Check 2: Plan is being passed**
- Open browser console
- Look for: `🔍 StatsigShell Debug:`
- Verify `userPlan` is not `null` or `undefined`
- Should show: `userPlan: "northstar_basic"` or `"northstar_pro"`
- If it's `null`, set your plan in Clerk dashboard (see Option B above)

**Check 3: Statsig gate updated**
- Go to Statsig Console → Feature Gates → `ai_ocr_enabled`
- Verify the rule checks `user.custom.plan` (not `user.plan`)
- Ensure the gate is **Enabled** (not disabled)

**Check 4: Statsig client initialized**
- Check console for Statsig initialization logs
- Should see: `🔍 StatsigUserBinder: Updating Statsig user:`
- Verify both `clerkUserId` and `userPlan` are correct

**Check 5: Clear cache**
```bash
# Sometimes Statsig caches gate results
# Clear browser cache and reload
# Or use incognito mode
```

## Common Issues

### Issue: clerkUserId is showing 'a-user' or 'anonymous'
**Solution:** 
1. Ensure you're signed in to your app
2. Restart your dev server completely (Ctrl+C, then `npm run dev`)
3. Clear browser cache and reload
4. Check Clerk dashboard to ensure your user exists

### Issue: userPlan is `free_user`
**Solution:** You need to actually subscribe to a plan or manually set it in Clerk metadata.

### Issue: userPlan is `null`
**Solution:** Your account has no subscription. Set one via Clerk dashboard or Stripe.

### Issue: Gate passes in app but fails in checkgate
**Solution:** Make sure you're passing `custom: { plan: "..." }` in the checkgate test.

### Issue: Changes not taking effect
**Solution:** Restart your dev server and clear browser cache.

### Issue: Statsig shows wrong user in console
**Solution:** Check Statsig Console → Metrics → Users to see what user ID Statsig is receiving. It should match your Clerk user ID.

## Success!

Once everything is working, you should see:
- ✅ Console logs showing `clerkUserId: "user_xxxxx..."` (your real Clerk user ID)
- ✅ Console logs showing `userPlan: "northstar_basic"` or `"northstar_pro"`
- ✅ Console logs showing `willInitializeStatsig: true`
- ✅ Gates passing in Statsig checkgate
- ✅ `checkAccess()` returning `hasAccess: true` for your plan's features
- ✅ Feature gating working correctly in your app
- ✅ In Statsig Console, you can see events tracked under your real user ID

## Additional Notes

### Why `custom` Object?

Statsig uses a specific user object structure:
- `userID`: User identifier
- `email`, `firstName`, `lastName`: Top-level properties
- `custom`: For custom properties like `plan`, `role`, etc.

This is why we put `plan` inside the `custom` object.

### Plan Precedence

The code checks for plan in this order:
1. `user.subscriptions[0].plan` (Clerk's experimental billing API)
2. `user.publicMetadata.subscription.plan` (Your current setup)
3. Defaults to `'free_user'` if no subscription

### Automatic Updates

The `StatsigUserBinder` component automatically updates the plan whenever:
- User signs in
- Subscription changes
- Clerk metadata updates

So once a user subscribes, their gates will automatically update!

---

Need help? Check:
- Browser console for debug logs
- Statsig Console → Metrics Explorer for event tracking
- Clerk Dashboard → Users → Your User → Metadata for current plan

