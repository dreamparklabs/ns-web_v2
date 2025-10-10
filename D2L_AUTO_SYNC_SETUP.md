# 🔄 D2L Auto-Sync Setup Guide

## Overview

The **D2L Auto-Sync** feature automatically syncs your D2L (Desire2Learn/Brightspace) assignments, grades, and discussions to Northstar when you log into your D2L account. No more manual syncing required!

## 🚀 How It Works

1. **Login Detection**: Extension monitors D2L pages for login activity
2. **Auto-Trigger**: When logged in, automatically extracts data using Gemini AI
3. **Smart Sync**: Only syncs if new data is found and respects rate limits (5-minute cooldown)
4. **Visual Feedback**: Shows elegant notifications during sync process
5. **Background Operation**: Works seamlessly without interrupting your workflow

## ⚙️ Setup Instructions

### Step 1: Enable Auto-Sync

1. **Open Extension**: Click the Northstar extension icon in your browser
2. **Find Auto-Sync Settings**: Scroll to "⚙️ Auto-Sync Settings" section
3. **Enable Toggle**: Check "Auto-sync when logging into D2L"
4. **Confirmation**: You'll see "✅ Auto-sync enabled!" message

### Step 2: Authenticate with Northstar

- **Required**: Must be logged into Northstar web app first
- **Extension Auth**: Click "🔐 Authenticate with Northstar" in extension popup
- **Verification**: Ensure you see your real name/email (not "session-detected")

### Step 3: Test Auto-Sync

1. **Navigate to D2L**: Go to your school's D2L/Brightspace login page
2. **Log In**: Complete your normal D2L login process
3. **Watch for Notification**: Look for purple "🌟 Northstar" notification in top-right
4. **Sync Status**: Should show "🔄 Auto-syncing D2L data to Northstar..."
5. **Completion**: Notification updates to "✅ Auto-sync complete! X items synced"

## 🎯 What Gets Auto-Synced

### ✅ Assignments
- Homework assignments ("Homework 0", "Homework 1A", etc.)
- Projects and coursework
- Due dates and submission status
- Points earned vs. maximum points

### ✅ Grades
- All grade items from grades page
- Score patterns like "25/25", "0/5", "- /50"
- Grade status (completed/not submitted)

### ✅ Discussions
- Discussion forum posts
- Student introductions
- Discussion assignments

### ✅ Quizzes & Exams
- Online quizzes and tests
- Quiz scores and attempts

## 🔧 Auto-Sync Settings

### Rate Limiting
- **Cooldown**: 5-minute minimum between auto-syncs
- **Purpose**: Prevents spam and respects D2L servers
- **Override**: Manual sync always available

### Detection Triggers
Auto-sync triggers when these D2L elements are detected:
- `[data-userid]` - User ID attribute
- `.d2l-navigation-s-header-username` - Username in header
- `.vui-heading-2` - Dashboard headings
- `.d2l-homepage` - Homepage elements
- `.d2l-page-title` - Page titles

### Supported D2L Domains
- `*.d2l.com`
- `*.brightspace.com`
- `*.mycourses.*`
- Any URL containing "d2l" or "brightspace"

## 🎨 Visual Notifications

### Sync Starting
```
🌟 Northstar
🔄 Auto-syncing D2L data to Northstar...
```

### Sync Complete
```
🌟 Northstar  
✅ Auto-sync complete! 12 items synced
```

### Sync Failed
```
🌟 Northstar
❌ Auto-sync failed - check connection
```

## 🐛 Troubleshooting

### Auto-Sync Not Triggering

**Check Authentication:**
```javascript
// Open browser console on D2L page
chrome.storage.local.get(['northstarAuth'], (data) => {
  console.log('Auth data:', data);
});
```

**Verify Settings:**
```javascript
chrome.storage.local.get(['autoSyncEnabled'], (data) => {
  console.log('Auto-sync enabled:', data.autoSyncEnabled);
});
```

**Check Last Sync:**
```javascript
chrome.storage.local.get(['lastAutoSync'], (data) => {
  const lastSync = new Date(data.lastAutoSync);
  console.log('Last auto-sync:', lastSync);
});
```

### Common Issues

1. **"No Northstar authentication found"**
   - Solution: Re-authenticate with Northstar in extension popup

2. **"Auto-sync skipped - synced recently"**
   - Solution: Wait 5 minutes or use manual sync

3. **"Auto-sync failed - check connection"**
   - Solution: Check internet connection and try again

4. **No notification appears**
   - Solution: Ensure auto-sync is enabled in extension settings

### Force Manual Sync
If auto-sync isn't working, you can always:
1. Open extension popup
2. Click "📤 Extract All Data"
3. Click "📤 Sync to Northstar"

## 🔒 Privacy & Security

- **Local Storage**: Settings stored locally in browser
- **Secure API**: All data encrypted in transit to Northstar
- **Rate Limited**: Respects D2L server limits
- **User Control**: Can disable auto-sync anytime

## 🚀 Advanced Configuration

### Disable Auto-Sync Temporarily
```javascript
chrome.storage.local.set({ autoSyncEnabled: false });
```

### Reset Last Sync Time (Force Immediate Sync)
```javascript
chrome.storage.local.remove(['lastAutoSync']);
```

### Check Auto-Sync Status
```javascript
chrome.storage.local.get(['autoSyncEnabled', 'lastAutoSync'], (data) => {
  console.log('Auto-sync enabled:', data.autoSyncEnabled);
  console.log('Last sync:', new Date(data.lastAutoSync || 0));
});
```

## 📊 Expected Performance

- **Detection Time**: < 2 seconds after D2L login
- **Extraction Time**: 10-30 seconds (depends on course size)
- **Sync Time**: 5-15 seconds to upload to Northstar
- **Total Time**: Usually under 1 minute for complete auto-sync

## 🎯 Success Metrics

After enabling auto-sync, you should see:
- ✅ Purple notifications on D2L pages
- ✅ New assignments appear in Northstar dashboard
- ✅ Grades automatically updated
- ✅ No manual intervention required

---

## 🆚 Alternative Sync Methods

If auto-sync doesn't meet your needs, consider these alternatives:

### Option 1: D2L API Integration (Future)
- Direct API connection to D2L
- Real-time sync capabilities
- Requires institutional API access

### Option 2: Background Sync Service (Future)
- Periodic sync every X hours
- Runs without browser interaction
- Requires persistent authentication

### Option 3: Manual Sync (Current Backup)
- Extension popup → "Extract All Data" → "Sync to Northstar"
- Full control over when sync occurs
- Always available as fallback

---

**🎉 Congratulations!** You now have seamless D2L auto-sync set up. Your assignments and grades will automatically appear in Northstar every time you log into D2L!






