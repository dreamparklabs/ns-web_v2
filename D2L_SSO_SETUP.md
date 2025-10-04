# D2L SSO Integration Setup Guide

This guide explains how to set up D2L Brightspace integration using Single Sign-On (SSO) - the secure and user-friendly way to connect your school account.

## 🎯 **How It Works**

The SSO integration uses OAuth 2.0 to securely connect with your school's D2L system:

1. **Enter School URL** → You provide your school's D2L Brightspace URL
2. **SSO Popup** → A secure popup opens to your school's login page
3. **School Login** → You log in with your regular school credentials (SSO)
4. **Permission Grant** → You authorize Northstar to access your D2L data
5. **Automatic Sync** → Your courses and assignments sync automatically

## 🚀 **Getting Started**

### Step 1: Access D2L Integration
1. Open Northstar application
2. Go to **Settings** (gear icon in sidebar)
3. Click on **"D2L Integration"** tab
4. Click **"Connect with D2L SSO"**

### Step 2: Enter Your School's URL
1. In the **"School D2L URL"** field, enter your institution's Brightspace URL
   - Examples:
     - `https://myschool.brightspace.com`
     - `https://lms.university.edu`
     - `https://d2l.college.edu`
2. Click **"Connect with SSO"**

### Step 3: Complete SSO Authentication
1. A secure popup window will open to your school's login page
2. **Log in with your school credentials** (username/password, or SSO provider)
3. You may be redirected through your school's SSO system (Google, Microsoft, etc.)
4. **Grant permission** when prompted to allow Northstar to access your D2L data
5. The popup will close automatically upon successful authentication

### Step 4: Verify Connection
1. You should see **"Connected"** status in the integration settings
2. Your D2L username will be displayed
3. Click **"Sync Courses & Assignments"** to import your data

## 🔧 **What Gets Synced**

### Automatic Data Import:
- ✅ **Course Enrollments** - All your active courses with details
- ✅ **Assignment Dropboxes** - Assignments with due dates and descriptions
- ✅ **Quizzes** - Quiz assignments with time limits
- ✅ **Graded Discussions** - Discussion forum assignments
- ✅ **Announcements** - Course news and updates
- ✅ **Calendar Events** - Important dates and deadlines

### Smart Features:
- **Duplicate Prevention** - Won't create duplicate assignments
- **Status Tracking** - Automatically updates todo/overdue/completed status
- **Real-time Sync** - Updates when you visit the app
- **Secure Storage** - OAuth tokens are encrypted and secure

## 🔐 **Security & Privacy**

### OAuth 2.0 Security:
- **No Password Storage** - Your school password is never stored
- **Encrypted Tokens** - Access tokens are encrypted in our database
- **Automatic Expiration** - Tokens expire and refresh automatically
- **Revocable Access** - You can disconnect at any time

### Data Privacy:
- **Read-Only Access** - We only read your D2L data, never modify it
- **Minimal Permissions** - Only requests necessary academic data
- **Local Processing** - Your data stays in your Northstar account
- **No Sharing** - Your academic data is never shared with third parties

## 🛠️ **Troubleshooting**

### Common Issues:

**❌ "Popup blocked"**
- **Solution**: Allow popups for this site in your browser settings
- **Chrome**: Click the popup icon in the address bar
- **Firefox**: Click "Options" → "Allow popups for [site]"

**❌ "School URL not found"**
- **Solution**: Verify your school's exact D2L URL
- **Check**: Log into D2L manually and copy the URL from your browser
- **Format**: Must include `https://` and the full domain

**❌ "Authentication failed"**
- **Solution**: Try these steps:
  1. Clear your browser cache and cookies
  2. Try logging into D2L manually first
  3. Ensure you're using the correct school credentials
  4. Check if your school requires VPN access

**❌ "Connection expired"**
- **Solution**: Click "Refresh Connection" in the D2L settings
- **Note**: OAuth tokens expire for security (usually after 1 hour)
- **Automatic**: The app will prompt you to refresh when needed

**❌ "Permission denied"**
- **Solution**: You may have denied permission during OAuth flow
- **Fix**: Disconnect and reconnect, making sure to grant permissions
- **Check**: Some schools require admin approval for third-party apps

### Advanced Troubleshooting:

**🔍 Network Issues:**
- Ensure you're on your school's network (or VPN if required)
- Check if your school blocks external API access
- Try connecting from campus network

**🔍 School Configuration:**
- Some schools disable OAuth for students
- Contact your IT department if OAuth consistently fails
- Ask about "third-party application access" policies

## 📋 **Environment Setup (For Developers)**

If you're setting up the development environment, add these to your `.env.local`:

```env
# D2L OAuth Configuration
D2L_CLIENT_ID=your_d2l_client_id
D2L_CLIENT_SECRET=your_d2l_client_secret
D2L_REDIRECT_URI=http://localhost:5173/auth/d2l/callback
```

**Note**: These are application-level credentials that need to be registered with D2L. For most users, the SSO flow works without these.

## 🔄 **Managing Your Connection**

### Refresh Connection:
- Tokens expire automatically for security
- Click **"Refresh Connection"** when prompted
- No need to re-enter credentials

### Sync Data:
- **Manual Sync**: Click "Sync Courses & Assignments" anytime
- **Automatic Sync**: Happens when you visit the app
- **Selective Sync**: Currently syncs all active courses

### Disconnect:
- Click **"Disconnect D2L"** to remove integration
- This will clear all synced data from Northstar
- You can reconnect at any time

## 📞 **Getting Help**

### Self-Service:
1. **Check Connection Status** in Settings → D2L Integration
2. **Review Error Messages** for specific guidance
3. **Try Refresh Connection** if authentication expired

### Contact Support:
- **School IT**: For D2L access or network issues
- **Northstar Support**: For integration-specific problems
- **Include**: Error messages, school name, and steps you tried

## 🎓 **Supported Schools**

This integration works with any school using:
- **D2L Brightspace** (any version with OAuth 2.0 support)
- **SSO Providers**: Google Workspace, Microsoft 365, SAML, etc.
- **Authentication Methods**: Username/password, multi-factor authentication

### Tested Institutions:
- Universities with Google Workspace SSO
- Colleges with Microsoft 365 integration
- Schools with SAML-based authentication
- Institutions with multi-factor authentication (MFA)

---

## 🎉 **You're All Set!**

Once connected, your D2L integration will:
- ✅ Automatically sync new assignments
- ✅ Update due dates and descriptions
- ✅ Track completion status
- ✅ Parse announcements for hidden assignments
- ✅ Keep everything organized in Northstar

**Enjoy seamless academic management with secure SSO integration!** 🚀
