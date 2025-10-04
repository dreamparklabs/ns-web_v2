// Northstar D2L Sync Background Script

console.log('Northstar D2L Sync: Background script starting...');

// Enhanced message listener for data extraction events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.action === 'dataExtracted') {
    console.log('Data extracted from:', sender.tab.url);
    console.log('Courses found:', message.data.courses?.length || 0);
    console.log('Assignments found:', message.data.assignments?.length || 0);
    
    // Process and validate the extracted data
    const processedData = processExtractedData(message.data);
    
    // Store the processed data
    chrome.storage.local.set({
      [`d2l_data_${sender.tab.id}`]: {
        data: processedData,
        url: sender.tab.url,
        timestamp: Date.now(),
        pageType: detectPageType(sender.tab.url)
      }
    });
    
    // Send notification if significant data was found
    if (processedData.assignments?.length > 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Northstar D2L Sync',
        message: `Found ${processedData.assignments.length} assignments and ${processedData.courses?.length || 0} courses ready to sync!`
      });
    }
    
    sendResponse({ success: true });
    return false; // Synchronous response
  }
  
  if (message.type === 'AUTH_DATA_RECEIVED') {
    console.log('Auth data received in background:', message.data);
    
    // Store auth data
    chrome.storage.local.set({
      'northstar_auth_data': {
        ...message.data,
        timestamp: Date.now()
      }
    });
    
    sendResponse({ success: true });
    return false; // Synchronous response
  }
  
  if (message.type === 'NORTHSTAR_AUTH_SUCCESS') {
    console.log('Auth success received in background:', message.data);
    
    // Store auth data in the format expected by popup
    chrome.storage.local.set({
      'northstarAuth': {
        user: message.data.user,
        token: null,
        timestamp: Date.now(),
        persistent: true
      }
    });
    
    sendResponse({ success: true });
    return false; // Synchronous response
  }
  
  if (message.type === 'AUTH_COMPLETE') {
    console.log('Auth completion received in background:', message.data);
    
    // Store auth completion data
    chrome.storage.local.set({
      'northstarAuth': {
        user: message.data.user,
        token: null,
        timestamp: Date.now(),
        persistent: true
      }
    });
    
    sendResponse({ success: true });
    return false; // Synchronous response
  }
  
  // Default response for unknown messages
  sendResponse({ success: false, error: 'Unknown message type' });
  return false; // Synchronous response
});

// Process and validate extracted data
function processExtractedData(rawData) {
  const processed = {
    userInfo: rawData.userInfo || null,
    courses: [],
    assignments: [],
    announcements: rawData.announcements || []
  };

  // Process courses - remove duplicates and validate
  if (rawData.courses && Array.isArray(rawData.courses)) {
    const courseMap = new Map();
    
    rawData.courses.forEach(course => {
      if (course.orgUnitId && course.name) {
        // Use orgUnitId as unique key, keep the most complete record
        const existing = courseMap.get(course.orgUnitId);
        if (!existing || course.name.length > existing.name.length) {
          courseMap.set(course.orgUnitId, {
            orgUnitId: course.orgUnitId,
            name: course.name.trim(),
            code: course.code || extractCourseCode(course.name),
            instructor: course.instructor || null,
            isActive: course.isActive !== false,
            url: course.url || null
          });
        }
      }
    });
    
    processed.courses = Array.from(courseMap.values());
    console.log(`Processed ${processed.courses.length} unique courses`);
  }

  // Process assignments - remove duplicates and validate
  if (rawData.assignments && Array.isArray(rawData.assignments)) {
    const assignmentMap = new Map();
    
    rawData.assignments.forEach(assignment => {
      if (assignment.name && assignment.name.trim().length > 0) {
        // Create a unique key based on name + course + type
        const key = `${assignment.name.trim()}_${assignment.courseOrgUnitId || 'unknown'}_${assignment.type || 'assignment'}`;
        
        const existing = assignmentMap.get(key);
        if (!existing || assignment.dueDate || assignment.maxPoints) {
          assignmentMap.set(key, {
            id: assignment.id || generateAssignmentId(),
            name: assignment.name.trim(),
            description: assignment.description || null,
            dueDate: validateDate(assignment.dueDate),
            type: assignment.type || 'assignment',
            submissionStatus: assignment.submissionStatus || null,
            maxPoints: assignment.maxPoints || null,
            pointsEarned: assignment.pointsEarned || null,
            courseOrgUnitId: assignment.courseOrgUnitId || null,
            courseName: assignment.courseName || null,
            courseCode: assignment.courseCode || null,
            url: assignment.url || null,
            source: assignment.source || 'unknown'
          });
        }
      }
    });
    
    processed.assignments = Array.from(assignmentMap.values());
    console.log(`Processed ${processed.assignments.length} unique assignments`);
  }

  return processed;
}

// Helper function to extract course code from course name
function extractCourseCode(courseName) {
  if (!courseName) return '';
  
  // Extract course code patterns like "CS 101", "MATH-250", "ENG_101"
  const codeMatch = courseName.match(/([A-Z]{2,4}[\s\-_]?\d{3,4})/i);
  return codeMatch ? codeMatch[1] : courseName.split(' ')[0] || '';
}

// Helper function to validate and parse dates
function validateDate(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    // Make sure it's a reasonable date (not in the far past or future)
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    
    if (date < oneYearAgo || date > twoYearsFromNow) {
      console.warn('Date outside reasonable range:', dateString);
      return null;
    }
    
    return date.toISOString();
  } catch (error) {
    console.warn('Invalid date format:', dateString);
    return null;
  }
}

// Helper function to generate assignment ID
function generateAssignmentId() {
  return `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Detect the type of D2L page for better data processing
function detectPageType(url) {
  if (!url) return 'unknown';
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('/home') || lowerUrl.includes('/dashboard')) return 'homepage';
  if (lowerUrl.includes('/dropbox/') || lowerUrl.includes('/d2l/lms/dropbox/')) return 'dropbox';
  if (lowerUrl.includes('/quizzes/') || lowerUrl.includes('/d2l/lms/quizzing/')) return 'quizzes';
  if (lowerUrl.includes('/discussions/') || lowerUrl.includes('/d2l/le/discussions/')) return 'discussions';
  if (lowerUrl.includes('/content/') || lowerUrl.includes('/le/')) return 'content';
  if (lowerUrl.includes('/grades/') || lowerUrl.includes('/gradebook/')) return 'gradebook';
  if (lowerUrl.includes('/calendar/') || lowerUrl.includes('/agenda/')) return 'calendar';
  
  return 'other';
}

// Simple function to check if a URL is a D2L page
function isD2LPage(url) {
  return url && (
    url.includes('brightspace.com') || 
    url.includes('.siu.edu') ||
    url.includes('/d2l/') ||
    (url.includes('.edu') && url.includes('mycourses'))
  );
}

// Clean up old data periodically (keep only last 24 hours)
chrome.alarms.create('cleanupOldData', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanupOldData') {
    chrome.storage.local.get(null, (items) => {
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      Object.keys(items).forEach(key => {
        if (key.startsWith('d2l_data_') && items[key].timestamp < oneDayAgo) {
          chrome.storage.local.remove(key);
        }
      });
    });
  }
});

console.log('Northstar D2L Sync: Enhanced background script initialized');
