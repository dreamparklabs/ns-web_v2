# Chrome Extension Assignment Sync - Complete Guide

## 🌟 Overview

The Northstar Chrome extension now provides a **complete authentication and sync solution** for D2L Brightspace assignments. Users can authenticate directly within the extension popup and sync their assignments seamlessly to Northstar without needing to manage separate browser sessions.

## ✨ **NEW: In-Extension Authentication with Multiple Fallbacks!**

🎉 **No more auth issues!** The extension now includes:
- **🔐 Built-in login form** - Sign in directly in the extension popup
- **🔄 Multiple auth detection methods** - URL params, cookies, session API, messaging
- **📤 One-click sync** - Extract and sync assignments with a single button
- **✅ Real-time feedback** - See sync progress and results immediately
- **🛡️ Robust fallbacks** - Multiple ways to detect successful authentication

## 🚀 What's New

### Enhanced Content Script (`content.js`)
- **Multi-method assignment extraction**: Dropbox, content pages, calendar, gradebook
- **Intelligent assignment detection**: Recognizes assignments, quizzes, discussions, projects, etc.
- **Enhanced due date parsing**: Supports multiple date formats
- **Course information extraction**: Automatically matches assignments to courses
- **Duplicate prevention**: Smart deduplication of assignments across different page types

### Enhanced Background Script (`background-simple.js`)
- **Data processing and validation**: Cleans and validates extracted data
- **Smart notifications**: Alerts users when assignments are found
- **Automatic cleanup**: Removes old data to prevent storage bloat
- **Page type detection**: Optimizes extraction based on D2L page type

### New API Endpoint (`/api/convex`)
- **Secure authentication**: Integrates with Clerk for user verification
- **Direct Convex integration**: Calls Convex functions server-side
- **Error handling**: Comprehensive error reporting
- **CORS support**: Enables cross-origin requests from extension

### Backend Integration (`d2lScraper.ts`)
- **Intelligent course matching**: Matches assignments to existing courses using name/code similarity
- **Assignment deduplication**: Prevents duplicate assignments in the database
- **Status tracking**: Tracks submission status and grades
- **Multiple assignment sources**: Supports dropbox, quizzes, discussions, etc.

## 🔧 Setup Instructions

### 1. Install the Extension

1. **Load the extension in Chrome**:
   ```bash
   # Navigate to chrome://extensions/
   # Enable "Developer mode"
   # Click "Load unpacked"
   # Select the browser-extension folder
   ```

2. **Verify permissions**:
   - The extension should request permissions for D2L sites
   - Check that notifications are enabled

### 2. Configure Northstar

1. **Ensure you're logged into Northstar** at `http://localhost:5173`
2. **Create at least one term** in the onboarding process
3. **Add some courses** (the extension will match assignments to these)

### 3. Test the Integration

## 📋 Testing Guide

### Test Scenario 1: Homepage Course Extraction

1. **Navigate to your D2L homepage/dashboard**
2. **Click the extension icon** (🚀 Simple D2L Test)
3. **Click "🚀 Extract All Data"** (the orange button)
4. **Expected results**:
   - Status shows "✅ All data extracted successfully!"
   - Shows counts of courses, assignments, etc.
   - "📤 Sync to Northstar" button appears if assignments are found

### Test Scenario 2: Multi-Course Comprehensive Extraction

1. **Navigate to your D2L homepage/dashboard**
2. **Click "🌟 Extract ALL COURSES"** (the red button)
3. **Expected results**:
   - Extracts data from ALL your courses automatically
   - Shows detailed breakdown by course
   - Much more comprehensive assignment extraction
   - "📤 Sync to Northstar" button appears

### Test Scenario 3: Sync to Northstar

1. **After extracting data with assignments** (using either extraction method)
2. **Make sure you're logged into Northstar** at http://localhost:5173
3. **Click "📤 Sync to Northstar"** (the blue button that appears after extraction)
4. **Expected results**:
   - Success message with sync counts
   - Assignments appear in Northstar dashboard
   - Detailed course matching results shown

## 🔍 Debugging

### Console Logging

The extension provides comprehensive logging. Open Chrome DevTools and check:

**Content Script Logs** (on D2L pages):
```
Northstar D2L Sync: Content script loaded
Extracting assignments from dropbox page...
✓ Extracted dropbox assignment 1: {name, type, dueDate}
Total assignments extracted: 5
```

**Background Script Logs**:
```
Data extracted from: [URL]
Courses found: 4
Assignments found: 12
Processed 12 unique assignments
```

**Popup Logs**:
```
Syncing assignments with course matching: [assignment data]
Assignment sync result: {success: true, totalSynced: 8}
✓ Matched "Math Homework 1" to course "Calculus I" (code match, score: 85)
```

### Common Issues

**Issue**: "No data found on this page"
- **Solution**: Try navigating to different D2L pages (homepage, assignments, content)
- **Cause**: Some pages may not have detectable course/assignment data

**Issue**: "User not authenticated with Clerk"
- **Solution**: Ensure you're logged into Northstar in the same browser
- **Cause**: Extension needs active Northstar session for API calls

**Issue**: "Could not match assignment to existing courses"
- **Solution**: Create courses in Northstar that match your D2L courses
- **Cause**: Assignment sync requires existing courses for intelligent matching

## 📊 Data Flow

```
D2L Page → Content Script → Background Script → Popup → API → Convex → Database
     ↓           ↓               ↓              ↓      ↓       ↓        ↓
  Extract    Process &       Store &        Display  Auth   Match   Store
   Data      Validate       Notify         Stats   Check  Courses  Assignments
```

## 🎯 Assignment Matching Algorithm

The system uses intelligent matching to associate D2L assignments with Northstar courses:

1. **Exact D2L Org Unit ID match** (Score: 100)
2. **Course code exact match** (Score: 85)
3. **Course name similarity** (Score: varies)
4. **Word overlap analysis** (Score: up to 80)

**Matching threshold**: 60+ score required for automatic assignment

## 📁 File Structure

```
browser-extension/
├── manifest.json           # Extension configuration
├── content.js             # Enhanced D2L data extraction
├── content-simple.js      # Alternative extraction script
├── background-simple.js   # Enhanced background processing
├── popup.js              # Extension UI and sync logic
├── popup-simple.html     # Extension popup interface
└── icons/                # Extension icons

app/routes/
└── api.convex.tsx        # New API endpoint for extension

convex/
└── d2lScraper.ts         # Enhanced assignment processing
```

## 🔒 Security Features

- **Authentication required**: All API calls require valid Clerk session
- **User verification**: Ensures users can only sync their own data
- **Data validation**: Validates and sanitizes all extracted data
- **CORS protection**: Secure cross-origin request handling

## 🚀 Next Steps

1. **Test with real D2L data** on your institution's Brightspace
2. **Monitor console logs** for any extraction issues
3. **Verify course matching** accuracy in Northstar
4. **Report any bugs** or edge cases discovered

## 📝 Notes

- The extension works with various D2L/Brightspace implementations
- Assignment extraction adapts to different D2L page layouts
- Course matching algorithm can be tuned by adjusting similarity thresholds
- All extracted data is processed locally before sending to Northstar

---

## 🎯 **UPDATED: Super Simple 4-Step Process**

### **🚀 Recommended Flow:**

1. **📍 Go to any D2L course page** (like the IoT course that worked before)

2. **🌟 Click the extension icon** → You'll see the new "Northstar D2L Sync" interface

3. **🔐 Quick Authentication** (Choose the easiest option):
   
   **Option A - Session Detection (Recommended):**
   - If you're already signed in to Northstar in another tab, click **"🔄 Check Session"**
   - Extension will automatically detect your login!
   
   **Option B - Sign In First:**
   - Click **"📝 Sign Up"** to create account OR open Northstar manually
   - Sign in to Northstar in the new tab
   - Return to extension and click **"🔄 Check Session"**

4. **📚 Extract & Sync**:
   - Click "🚀 Extract All Data" 
   - When extraction completes, click "📤 Sync to Northstar"
   - Done! Your assignments are now in Northstar

### **🎉 What You'll See:**
- ✅ Login form when not authenticated
- ✅ Green "Ready to extract" status when logged in  
- ✅ Assignment counts after extraction
- ✅ Blue sync section with one-click sync button
- ✅ Success message with sync results

### **💡 Pro Tips:**
- The extension remembers your login across browser sessions
- You can extract from multiple courses and sync them all at once
- If sync fails, try logging out and back in
- Check the Northstar dashboard to see your synced assignments

---

**Ready to sync your D2L assignments with Northstar!** 🎉

For issues or questions, check the browser console logs for detailed debugging information.
