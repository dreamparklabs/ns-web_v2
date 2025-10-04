# D2L Web Scraping Integration Guide

## 🎯 **Perfect Solution for Schools Without OAuth Access**

When your school (like Southern Illinois University) doesn't provide OAuth API access to students, web scraping is the secure alternative to sync your D2L data with Northstar.

## 🔍 **Why Web Scraping?**

**The Problem:**
- Most schools restrict D2L API access to administrators only
- Students can't get OAuth credentials for third-party apps
- Manual data entry is time-consuming and error-prone

**The Solution:**
- Browser extension extracts data from D2L pages you already have access to
- Secure communication with your Northstar account
- No passwords or API keys required
- Works with any D2L instance

## 🛠️ **How It Works**

### 1. **Data Extraction Process**
```
D2L Page → Browser Extension → Data Extraction → Secure Upload → Northstar
```

### 2. **What Gets Extracted**
From your D2L console error, we can see rich data is available:
```javascript
// User Information (from widget data)
data-ft-user-id="856579076"
data-ft-user-first-name="Cameron"
data-ft-user-last-name="McCullough"
data-ft-user-email="cameron.mccullough@siu.edu"
data-ft-schoolurl="mycourses.siu.edu"
```

### 3. **Security Model**
- **No Credentials Stored** - Uses your existing D2L session
- **Page-Level Access** - Only extracts from pages you can already see
- **Encrypted Transfer** - All data encrypted in transit
- **User Control** - You decide when to extract and sync

## 🚀 **Setup Instructions**

### Step 1: Install Browser Extension

**For Chrome/Edge:**
1. Download the extension files from `browser-extension/` folder
2. Open Chrome → Settings → Extensions
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `browser-extension` folder
5. Pin the extension to your toolbar

**For Firefox:**
1. Open Firefox → Add-ons → Settings (gear icon)
2. Click "Debug Add-ons"
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the `browser-extension` folder

### Step 2: Configure in Northstar

1. **Open Northstar** → Settings → D2L Integration
2. **Click "Web Scraping (Alternative)"**
3. **Enter your school URL**: `https://mycourses.siu.edu`
4. **Click "Initialize Web Scraping"**

### Step 3: Extract D2L Data

1. **Log into your D2L account** normally
2. **Navigate to key pages**:
   - D2L Homepage/Dashboard
   - Individual course pages
   - Assignment/Dropbox pages
   - Quiz pages
   - Discussion forums
3. **Click the Northstar extension icon**
4. **Click "Extract D2L Data"**
5. **Click "Sync to Northstar"**

## 📊 **Data Sources & Extraction Points**

### **Homepage/Dashboard**
```javascript
// Extracts from course tiles and navigation
const courseTiles = document.querySelectorAll('.d2l-course-tile, .d2l-enrollment-card');
// Results: Course names, codes, org unit IDs, instructor info
```

### **Assignment Pages**
```javascript
// Extracts from dropbox listings
const assignments = document.querySelectorAll('.d2l-datalist-item, .dropbox-item');
// Results: Assignment names, due dates, submission status
```

### **Quiz Pages**
```javascript
// Extracts quiz information
const quizzes = document.querySelectorAll('.quiz-item, .d2l-table tbody tr');
// Results: Quiz names, time limits, due dates, attempt status
```

### **Discussion Forums**
```javascript
// Extracts graded discussions
const discussions = document.querySelectorAll('.discussion-item');
// Results: Discussion topics, due dates, grading info
```

### **User Information**
```javascript
// Extracts from page source (like your console error)
const userPatterns = {
  userId: /data-ft-user-id[="](\d+)/i,
  firstName: /data-ft-user-first-name[="]([^"&]+)/i,
  email: /data-ft-user-email[="]([^"&]+)/i,
};
```

## 🔧 **Extension Features**

### **Smart Data Detection**
- **Auto-detects D2L pages** and activates extraction
- **Identifies assignment patterns** in content modules
- **Parses various date formats** for due dates
- **Extracts submission status** for completion tracking

### **User-Friendly Interface**
- **Visual status indicators** (connected/not connected)
- **Real-time extraction stats** (courses found, assignments found)
- **One-click sync** to Northstar
- **Error handling** with helpful messages

### **Security Features**
- **Content Security Policy** prevents malicious code injection
- **Same-origin enforcement** only works on D2L domains
- **No persistent storage** of sensitive data
- **Encrypted communication** with Northstar servers

## 🎯 **Specific to Your School (SIU)**

Based on your console error from `mycourses.siu.edu`, the extension will extract:

### **Available User Data:**
```
User ID: 856579076
Name: Cameron McCullough  
Email: cameron.mccullough@siu.edu
School URL: mycourses.siu.edu
```

### **SIU-Specific Patterns:**
- **URL Structure**: `mycourses.siu.edu/d2l/...`
- **Widget Integration**: Forethought support widget contains user data
- **Course Navigation**: Standard D2L navigation patterns
- **Assignment Structure**: Dropbox-based assignment system

## 🛡️ **Privacy & Security**

### **What We DON'T Access:**
- ❌ Your D2L password
- ❌ Other students' data
- ❌ Grade information of other students
- ❌ Administrative functions
- ❌ Private messages or communications

### **What We DO Access:**
- ✅ Your course enrollments (visible to you)
- ✅ Your assignments and due dates (visible to you)
- ✅ Your quiz information (visible to you)
- ✅ Your discussion forum assignments (visible to you)
- ✅ Course announcements (visible to you)
- ✅ Your user profile information (already public in page source)

### **Data Handling:**
- **Local Processing** - Data processed in your browser first
- **Encrypted Transfer** - HTTPS encryption for all communications
- **No Third Parties** - Data goes directly to your Northstar account
- **User Control** - You trigger all extractions manually
- **Audit Trail** - All sync activities logged in Northstar

## 🔄 **Workflow Examples**

### **Daily Sync Routine:**
1. **Morning**: Open D2L homepage, click extension, sync courses
2. **Check Assignments**: Visit assignment pages, extract new deadlines
3. **Review Announcements**: Sync any new announcements with assignments
4. **Update Status**: Extension automatically tracks completion status

### **New Semester Setup:**
1. **Course Registration**: After registering, sync new courses
2. **Syllabus Week**: Extract all assignments as they're posted
3. **Ongoing Updates**: Weekly sync to catch new assignments and changes

### **Before Exams:**
1. **Quiz Review**: Sync all quiz information and deadlines
2. **Assignment Check**: Ensure all submissions are tracked
3. **Discussion Posts**: Sync graded discussion requirements

## 🆘 **Troubleshooting**

### **Extension Not Working:**
- **Check D2L Login**: Ensure you're logged into D2L first
- **Refresh Page**: Some D2L pages load content dynamically
- **Clear Cache**: Clear browser cache and reload D2L
- **Check Permissions**: Ensure extension has permission for your school domain

### **No Data Found:**
- **Try Different Pages**: Homepage, course pages, assignment pages
- **Wait for Page Load**: Let D2L fully load before extracting
- **Check Network**: Ensure stable internet connection
- **Update Extension**: Reload extension in developer mode

### **Sync Failures:**
- **Northstar Login**: Ensure you're logged into Northstar
- **Network Issues**: Check internet connectivity
- **Browser Blocking**: Disable ad blockers temporarily
- **CORS Issues**: Ensure Northstar is running on correct port

## 📱 **Browser Compatibility**

### **Fully Supported:**
- ✅ **Chrome 88+** (Recommended)
- ✅ **Microsoft Edge 88+**
- ✅ **Firefox 85+**
- ✅ **Safari 14+** (with some limitations)

### **Features by Browser:**
| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|---------|
| Data Extraction | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ✅ | ⚠️ | ❌ |
| Context Menu | ✅ | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ⚠️ |

## 🎓 **Best Practices**

### **For Students:**
1. **Regular Syncing** - Extract data weekly or after major D2L updates
2. **Multiple Pages** - Visit different D2L pages for comprehensive extraction
3. **Verify Data** - Check Northstar after sync to ensure accuracy
4. **Keep Extension Updated** - Reload extension when D2L interface changes

### **For IT Departments:**
1. **Whitelist Domains** - Allow connections to Northstar servers
2. **Browser Policies** - Don't block extension installation
3. **Network Access** - Ensure HTTPS traffic isn't filtered
4. **Support Documentation** - Share this guide with students

## 🔮 **Future Enhancements**

### **Planned Features:**
- **Auto-sync Scheduling** - Periodic background extraction
- **Change Detection** - Only sync modified assignments
- **Bulk Operations** - Extract from multiple courses simultaneously
- **Mobile Support** - Mobile browser extension versions
- **AI Enhancement** - Better assignment detection in announcements

### **Integration Improvements:**
- **Calendar Sync** - Extract D2L calendar events
- **Grade Tracking** - Monitor assignment grades and feedback
- **Notification System** - Alert for new assignments or due dates
- **Offline Support** - Cache extracted data for offline access

---

## 🎉 **You're Ready to Go!**

This web scraping solution provides a secure, reliable way to sync your D2L data with Northstar when OAuth isn't available. The browser extension gives you full control over what data is extracted and when it's synced.

**Key Benefits:**
- ✅ **No API restrictions** - Works with any D2L instance
- ✅ **Secure extraction** - Only accesses data you can already see
- ✅ **User controlled** - You decide when to sync
- ✅ **Comprehensive data** - Extracts courses, assignments, quizzes, discussions
- ✅ **Easy setup** - No complex configurations required

**Get started today and enjoy seamless D2L integration with Northstar!** 🚀
