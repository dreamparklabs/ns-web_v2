# D2L Brightspace Integration Setup

This guide will help you set up the D2L Brightspace integration with your Northstar application.

## Overview

The D2L integration automatically syncs:
- ✅ **Courses** - Enrolled course details and information
- ✅ **Assignments** - Dropbox assignments with due dates and descriptions
- ✅ **Quizzes** - Quiz assignments with due dates
- ✅ **Discussions** - Graded discussion forum assignments
- ✅ **Announcements** - AI-powered parsing to extract hidden assignments
- ✅ **Calendar Events** - Due dates and important dates
- ✅ **Course Content** - Module analysis for assignment extraction

## Prerequisites

1. **D2L Brightspace Account** - You must have an active student account
2. **API Access** - Your institution must allow API access for students
3. **Northstar Account** - Fully set up with courses and terms

## Step 1: Get D2L API Credentials

### 1.1 Access D2L API Settings
1. Log into your D2L Brightspace account
2. Click on your profile/avatar in the top right
3. Select **"Account Settings"**
4. Look for **"API Access"** or **"Developer Tools"** section
   - If not available, contact your institution's IT support

### 1.2 Create API Key Pair
1. In the API Access section, click **"Create New Key Pair"**
2. Give it a name like "Northstar Integration"
3. Copy and save:
   - **User ID** (e.g., `12345`)
   - **User Key** (long string of characters)
   - **Base URL** (e.g., `https://myschool.brightspace.com`)

⚠️ **Important**: Keep these credentials secure and never share them.

## Step 2: Configure Environment Variables

Add these variables to your `.env.local` file:

```env
# D2L Brightspace Integration
D2L_API_BASE_URL=https://your-institution.brightspace.com
D2L_APP_ID=your_d2l_app_id
D2L_APP_KEY=your_d2l_app_key

# OpenAI API for AI-powered content parsing (optional)
OPENAI_API_KEY=your_openai_api_key
```

**Note**: The `D2L_APP_ID` and `D2L_APP_KEY` are application-level credentials that need to be registered with D2L. For development, you can use placeholder values and the integration will work with user-level credentials only.

## Step 3: Set Up Integration in Northstar

### 3.1 Access D2L Settings
1. Open Northstar application
2. Go to **Settings** (gear icon in sidebar)
3. Click on **"D2L Integration"** tab
4. Click **"Configure D2L Integration"**

### 3.2 Enter Credentials
1. **D2L Base URL**: Your institution's Brightspace URL
2. **User ID**: From Step 1.2
3. **User Key**: From Step 1.2
4. Click **"Save Credentials"**

### 3.3 Initial Sync
1. Click **"Sync Courses"** to import your enrolled courses
2. Click **"Sync Assignments"** to import assignments, quizzes, and discussions
3. Click **"Parse Announcements"** to use AI to find hidden assignments
4. Or use **"Full Sync"** to do everything at once

## Step 4: Verify Integration

### 4.1 Check Synced Data
1. Go to **Classes** page - you should see your D2L courses
2. Go to **Assignments** page - you should see imported assignments
3. Look for assignments marked with D2L icon or "AI Generated" badge

### 4.2 Test Automatic Updates
The integration will automatically:
- Update assignment statuses (todo → overdue → completed)
- Sync new announcements and content
- Parse new assignments from course updates

## Features

### 🤖 AI-Powered Assignment Detection
The system uses AI to analyze:
- Course announcements for assignment mentions
- Module content for hidden assignments
- Due date extraction from natural language
- Assignment type classification

### 🔄 Automatic Synchronization
- **Real-time updates** when you visit the app
- **Smart parsing** of announcement text
- **Duplicate prevention** - won't create duplicate assignments
- **Status management** - keeps assignment statuses up to date

### 📊 Data Mapping
D2L data is mapped to Northstar as follows:

| D2L Item | Northstar Type | Notes |
|----------|----------------|--------|
| Dropbox Assignment | Assignment | Direct mapping with due dates |
| Quiz | Quiz | Mapped as quiz-type assignment |
| Graded Discussion | Discussion | Only graded discussions are synced |
| Announcement | Assignment (AI) | AI-parsed assignments from text |
| Course | Course | Enrolled courses with details |

## Troubleshooting

### Common Issues

**❌ "D2L credentials not found"**
- Verify you entered credentials correctly
- Check that your User ID and User Key are valid
- Ensure your institution allows API access

**❌ "Permission denied (publickey)"**
- This usually means your institution requires app-level credentials
- Contact your IT department about D2L API access for students

**❌ "No assignments synced"**
- Check if you have active assignments in D2L
- Verify courses are properly enrolled and active
- Try syncing individual courses instead of all courses

**❌ "AI parsing failed"**
- This is optional - the integration works without AI parsing
- Check if OpenAI API key is configured (if desired)
- AI parsing requires announcements with assignment-like content

### Getting Help

1. **Check Integration Status** in Settings → D2L Integration
2. **Review Sync Messages** for specific error details
3. **Contact Support** if issues persist

## Security & Privacy

- **Credentials** are stored securely and encrypted
- **API calls** use D2L's secure authentication
- **No passwords** are stored - only API keys
- **Data sync** is one-way (D2L → Northstar)
- **AI parsing** is optional and can be disabled

## Advanced Configuration

### Custom Sync Intervals
You can modify sync behavior by adjusting these settings in the D2L Integration modal:
- Manual sync only (recommended)
- Automatic sync on app launch
- Scheduled sync intervals

### API Rate Limiting
The integration respects D2L's API rate limits:
- Max 100 requests per minute
- Automatic retry with exponential backoff
- Batched requests for efficiency

### Data Retention
- Synced assignments remain in Northstar even if removed from D2L
- You can manually delete unwanted synced assignments
- Course data is updated, not duplicated

## API Reference

The integration uses these D2L Valence API endpoints:
- `/d2l/api/lp/1.0/enrollments/myenrollments/` - Course enrollments
- `/d2l/api/lp/1.0/courses/{orgUnitId}` - Course details  
- `/d2l/api/le/1.0/{orgUnitId}/dropbox/folders/` - Assignments
- `/d2l/api/le/1.0/{orgUnitId}/quizzes/` - Quizzes
- `/d2l/api/le/1.0/{orgUnitId}/discussions/forums/` - Discussions
- `/d2l/api/le/1.0/{orgUnitId}/news/` - Announcements

For more details, see the [D2L Valence API Documentation](https://docs.valence.desire2learn.com/reference.html).

---

🎉 **You're all set!** Your D2L integration should now be working. Enjoy automatic assignment syncing and AI-powered content detection!
