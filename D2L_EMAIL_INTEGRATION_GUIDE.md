# 📧 D2L Email Integration Setup Guide

## 🎯 **Perfect for SIU and All D2L Schools**

This guide shows you how to automatically sync your D2L assignments and grades using email notifications - **no API access required!**

## 📋 **What Gets Extracted from Your Emails**

Based on your SIU email examples, our system automatically detects and extracts:

### **📊 Grade Notifications**
- ✅ **Individual Grades**: `"Your grade for Quiz 5 has been updated"`
- ✅ **Grade Details**: `"Your grade is: 0 / 100, F, 0 / 7% of final grade"`
- ✅ **Updated Grades**: `"Updated - Quiz 6: Your grade: 9.5 / 10, A"`
- ✅ **Current Grades**: `"Current Grade: 198.87 / 230, B"`

### **📅 Assignment Due Dates**
- ✅ **Relative Dates**: `"Lab 7 - Due date is in 6 days, 16 hours"`
- ✅ **Absolute Dates**: `"Due date: Sunday, October 5, 2025 11:59 PM CDT"`
- ✅ **Multiple Assignments**: Extracts all assignments from activity summaries

### **📚 Course Information & Smart Matching**
- ✅ **Course Codes**: `"ITEC-235-001"`, `"ITEC-342-940"` 
- ✅ **Course Names**: `"System Administration"`, `"Information Security Fundamentals"`
- ✅ **Semester Info**: `"Fall 2025"` automatically detected
- ✅ **Smart Normalization**: `"ITEC-216-940"` matches existing `"ITEC216"` courses
- ✅ **Format Recognition**: Handles `"CS 101"`, `"MATH-205-001"`, `"ITEC216"` variations

### **📝 Assignment Types**
- ✅ **Quizzes**: Automatically categorized
- ✅ **Labs**: Detected and labeled
- ✅ **Exams**: Identified from content
- ✅ **Projects**: Classified appropriately

## 🚀 **Setup Instructions**

### **Step 1: Access Assignment Master Settings**
1. Open Northstar
2. Go to **Settings** (gear icon)
3. Click **"Assignment Master"** tab
4. Click **"Manage Assignment Master Database"**

### **Step 2: Add Email Integration**
1. Click **"Email Integration"** tab
2. Click **"Add Email Integration"**
3. Choose your email provider:
   - **Gmail** (recommended)
   - **Outlook**
   - **IMAP** (for other providers)

### **Step 3: Configure Filters (Pre-configured for SIU)**
The system comes pre-configured with SIU-specific filters:

**From Filters** (automatically included):
- `mycourses@siu.edu`
- `brightspace`
- `d2l`
- `noreply`

**Subject Filters** (automatically included):
- `updated grade`
- `activity summary`
- `has been created`
- `has been updated`
- `assignment`, `quiz`, `exam`

### **Step 4: OAuth Authentication**
1. Click **"Connect"** for your email provider
2. **Authorize Northstar** to access your email
3. **Grant permissions** for reading emails
4. **Verify connection** - you should see "Connected" status

### **Step 5: Test the Integration**
1. Click **"Sync Now"** to test
2. Check **"Assignment Sources"** tab
3. Review detected assignments
4. **Process sources** to create assignments

## 📊 **What You'll See**

### **Activity Summary Emails → Multiple Assignments**
From emails like this:
```
Activity summary for Fall 2025 System Administration (ITEC-235-001)

Course Updates (5)
4 Assignments with Unread Feedback
1 Quizzes Not Attempted

Assignment (1)
Lab 7 - Due date is in 6 days, 16 hours

Quiz (1)
Quiz 7 - Due date is in 6 days, 16 hours

Course Grades (2)
Updated - Lab 5: Your grade: 50 / 50, A
Updated - Quiz 6: Your grade: 9.5 / 10, A
```

**Northstar automatically creates:**
- ✅ **Lab 7** (due in 6 days, 16 hours)
- ✅ **Quiz 7** (due in 6 days, 16 hours)  
- ✅ **Lab 5** (completed, grade: 50/50, A)
- ✅ **Quiz 6** (completed, grade: 9.5/10, A)

### **Grade Update Emails → Automatic Grade Sync**
From emails like:
```
Fall 2025 Information Security Fundamentals (ITEC-216-940) - Updated Grade: 
Your grade for "Quiz 5" has been updated

Your grade is: 0 / 100, F, 0 / 7% of final grade
```

**Northstar automatically:**
- ✅ **Updates Quiz 5** with grade 0/100
- ✅ **Sets status** to completed
- ✅ **Links to course** ITEC-216-940
- ✅ **Calculates percentage** automatically

## 🔧 **Advanced Configuration**

### **Custom Keywords**
Add your own keywords to catch more assignments:
- **Body Keywords**: `"homework"`, `"project"`, `"discussion"`
- **Exclude Keywords**: `"cancelled"`, `"postponed"`

### **Folder Monitoring**
- Set specific folder: `"D2L Notifications"`
- Monitor all folders: Leave blank

### **Sync Frequency**
- **Hourly**: For immediate updates
- **Daily**: For regular sync (recommended)
- **Manual**: Sync only when you click

## 📈 **Benefits**

### **🎯 Complete Coverage**
- **Never miss assignments** from any course
- **Automatic grade updates** as soon as posted
- **Multiple assignments** from single emails
- **Works with all D2L schools** (not just SIU)

### **🤖 Smart Processing**
- **85% confidence** for activity summaries
- **Duplicate detection** across email sources
- **Intelligent conflict resolution**
- **Course auto-linking**

### **🔒 Secure & Private**
- **OAuth authentication** (no passwords stored)
- **Read-only access** to your emails
- **Encrypted data transfer**
- **You control what gets synced**

## 🧠 **Smart Course Matching**

The system automatically recognizes that different course code formats refer to the same course:

### **Course Code Normalization**
```
"ITEC-216-940" → "ITEC216"
"ITEC 216"     → "ITEC216"  
"CS 101"       → "CS101"
"MATH-205-001" → "MATH205"
```

### **How It Works**
1. **Extracts department** (e.g., "ITEC", "CS", "MATH")
2. **Extracts course number** (e.g., "216", "101", "205")
3. **Removes formatting** (spaces, hyphens, section numbers)
4. **Matches against existing courses** in your database

### **Benefits**
- ✅ **No duplicate courses** from different sources
- ✅ **Assignments link correctly** regardless of format
- ✅ **Works across all integrations** (API, email, ICS, scraping)
- ✅ **Handles section numbers** automatically

## 🆘 **Troubleshooting**

### **No Assignments Detected**
1. **Check filters** - make sure `mycourses@siu.edu` is included
2. **Verify email provider** - ensure OAuth is connected
3. **Check confidence threshold** - lower to 30% for testing
4. **Review source logs** - check for parsing errors

### **Duplicate Assignments**
1. **Master database** automatically handles duplicates
2. **Conflict resolution** merges data from multiple sources
3. **Manual review** available in Assignment Sources tab

### **Wrong Course Linking**
1. **Course auto-detection** from email content
2. **Smart normalization** handles format differences
3. **Manual course selection** in ICS feeds
4. **Course creation** if not found

## 🎉 **You're All Set!**

Your D2L email integration will now:
- ✅ **Monitor your inbox** for D2L notifications
- ✅ **Extract assignments** and grades automatically  
- ✅ **Create assignments** in Northstar
- ✅ **Update grades** as they're posted
- ✅ **Handle multiple courses** simultaneously

**The Assignment Master Database ensures you never miss another assignment or grade update!** 🚀
