# 📅 SIU D2L ICS Calendar Setup Guide

## 🎯 **Get Your Assignments Synced in 2 Minutes**

This guide shows SIU students how to instantly sync all D2L assignments using the ICS calendar feed.

## 🚀 **Step-by-Step Setup**

### **Step 1: Get Your ICS Feed URL**

1. **Log into D2L**: Go to [https://mycourses.siu.edu](https://mycourses.siu.edu)
2. **Open Calendar**: Click the **Calendar** link in the main navigation
3. **Access Settings**: Click the **gear icon** (⚙️) in the calendar view
4. **Find Export Options**: Look for **"Export"** or **"Subscribe"** section
5. **Copy ICS URL**: Copy the **"All Courses"** ICS feed URL

**Your URL will look like:**
```
https://mycourses.siu.edu/d2l/le/calendar/feed/user/feed.ics?token=aco0h7tcq4vy5qz31e613
```

### **Step 2: Add to Northstar**

1. **Open Northstar**: Go to Settings → D2L Integration
2. **Click ICS Calendar Feed**: The green "📅 ICS Calendar Feed (Instant)" button
3. **Paste URL**: Paste your ICS feed URL
4. **Name Your Feed**: e.g., "SIU Fall 2025 Assignments"
5. **Click Add Feed**: The system will sync immediately!

## 📊 **What You'll Get**

Based on your actual SIU D2L feed, Northstar will automatically detect:

### **✅ Lab Assignments**
- `Lab 10 - Due` → **Lab 10** (due November 10, 2025)
- `Lab 11 - Available` → **Lab 11** (available November 10, 2025)
- `Lab 12 - Due` → **Lab 12** (due November 24, 2025)

### **✅ Quizzes**  
- `Quiz 3 - Availability Ends` → **Quiz 3** (ends December 15, 2025)
- `Quiz 5 - Availability Ends` → **Quiz 5** (ends December 22, 2025)
- `Quiz 6 - Availability Ends` → **Quiz 6** (ends December 15, 2025)

### **✅ Course Evaluations**
- `Course Eval - Due` → **Course Eval** (due December 6, 2025)

### **✅ Perfect Course Linking**
All assignments automatically link to:
- **Course**: `"System Administration"` 
- **Course Code**: `"ITEC-235-001"` → Normalized to `"ITEC235"`
- **Semester**: `"Fall 2025"`

## 🎉 **Immediate Results**

**After clicking "Add Feed":**
1. ✅ **Instant Sync** - No waiting for background jobs
2. ✅ **Assignment Detection** - AI identifies all assignments
3. ✅ **Smart Course Matching** - Links to existing courses
4. ✅ **Due Date Parsing** - Accurate timestamps
5. ✅ **Ready to Process** - Review in Assignment Sources tab

## 🔧 **Advanced Settings**

### **Assignment Keywords** (Optional)
Add custom keywords to catch more assignments:
```
project, presentation, homework, discussion, exam
```

### **Exclude Keywords** (Optional)  
Skip non-academic events:
```
meeting, break, holiday, event, speaker
```

### **Auto-Create Courses** ✅
Let Northstar create courses automatically from calendar data.

## 📈 **Expected Detection Results**

From your SIU feed, expect to see:
- **~15-20 assignments** detected from System Administration course
- **90%+ confidence** scores for lab and quiz assignments  
- **Perfect course linking** to ITEC-235-001
- **Accurate due dates** parsed from ICS timestamps

## 🔄 **Ongoing Sync**

After setup:
- ✅ **Daily automatic sync** keeps assignments updated
- ✅ **New assignments** detected as they're added to D2L
- ✅ **Due date changes** reflected immediately
- ✅ **Works with multiple courses** in your schedule

## 🆘 **Troubleshooting**

### **"No assignments detected"**
- **Check URL**: Make sure it's the "All Courses" feed, not a single course
- **Verify access**: URL should work when pasted in browser
- **Check dates**: Feed might only show future assignments

### **"Wrong course linking"**  
- **Course codes normalized**: `"ITEC-235-001"` becomes `"ITEC235"`
- **Manual linking**: Use course dropdown in feed settings
- **Create courses**: Enable auto-create in feed settings

### **"Duplicate assignments"**
- **Master database**: Automatically handles duplicates across sources
- **Smart matching**: Uses course code + title + due date
- **Manual review**: Check Assignment Sources tab

## 💡 **Pro Tips**

### **Multiple Semesters**
- Use separate feeds for different terms
- Name feeds clearly: `"SIU Fall 2025"`, `"SIU Spring 2026"`

### **Course-Specific Feeds**
- D2L allows individual course calendar exports
- Use for detailed assignment tracking per course

### **Combine with Email**
- Add email integration for grade notifications
- ICS handles assignments, email handles grades
- Perfect complementary coverage!

## 🎯 **Why This Works So Well**

Your SIU D2L feed is **perfectly structured** for automatic parsing:

```ics
SUMMARY:Lab 10 - Due
LOCATION:Fall 2025 System Administration (ITEC-235-001)
DTSTART:20251110T055900Z
```

**Northstar detects:**
- ✅ **Assignment Type**: "Lab" from summary
- ✅ **Assignment Number**: "10" from summary  
- ✅ **Due Date**: November 10, 2025 at 11:59 PM
- ✅ **Course**: "System Administration" from location
- ✅ **Course Code**: "ITEC-235-001" from location
- ✅ **Semester**: "Fall 2025" from location

This rich metadata makes SIU's D2L integration **exceptionally reliable**!

---

## 🚀 **Ready to Get Started?**

1. **Copy your ICS feed URL** from D2L Calendar settings
2. **Go to Northstar Settings** → D2L Integration  
3. **Click "📅 ICS Calendar Feed (Instant)"**
4. **Paste URL and click Add**
5. **Watch your assignments sync instantly!** ✨

**Your complete D2L assignment database is just 2 minutes away!** 🎉




