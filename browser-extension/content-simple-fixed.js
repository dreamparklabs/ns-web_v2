// Simple Northstar D2L Content Script - FIXED VERSION
console.log('🚀 Simple Northstar content script loaded on:', window.location.href);

// Listen for auth messages from the web app
window.addEventListener('message', (event) => {
  // Only accept messages from the same origin
  if (event.origin !== window.location.origin) {
    return;
  }
  
  if (event.data && event.data.type === 'NORTHSTAR_AUTH_SUCCESS' && event.data.source === 'northstar_auth') {
    console.log('🎉 Received auth success message from web app:', event.data);
    
    // Store auth data for the extension to use
    try {
      localStorage.setItem('northstar_extension_auth_received', JSON.stringify({
        ...event.data.data,
        timestamp: Date.now()
      }));
      console.log('✅ Stored auth data in localStorage for extension');
      
      // Also try to send to background script
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'AUTH_DATA_RECEIVED',
          data: event.data.data
        }).catch((error) => {
          console.log('Failed to send auth data to background script:', error);
        });
        
        // Also send the success message that the popup is listening for
        chrome.runtime.sendMessage({
          type: 'NORTHSTAR_AUTH_SUCCESS',
          data: event.data.data
        }).catch((error) => {
          console.log('Failed to send auth success to background script:', error);
        });
      }
      
      // Store in Chrome extension storage directly from content script with real user data
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const realUserData = {
          authenticated: true,
          clerkUserId: event.data.data.user.clerkUserId,
          userId: event.data.data.user.clerkUserId,
          email: event.data.data.user.email || '',
          firstName: event.data.data.user.firstName || '',
          fullName: event.data.data.user.fullName || event.data.data.user.firstName || event.data.data.user.email,
          requiresCallback: false
        };
        
        chrome.storage.local.set({
          'northstarAuth': {
            user: realUserData,
            token: null,
            timestamp: Date.now(),
            persistent: true,
            isMinimal: false
          }
        }, () => {
          if (chrome.runtime.lastError) {
            console.log('Content script Chrome storage error:', chrome.runtime.lastError.message);
          } else {
            console.log('✅ Content script stored REAL auth data in Chrome extension storage:', realUserData);
          }
        });
      }
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  }
});

// Also listen for URL-based auth completion (fallback)
if (window.location.pathname === '/extension-auth-callback') {
  console.log('🔍 On extension auth callback page, checking for auth data...');
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth_success') === 'true') {
    const clerkUserId = urlParams.get('clerk_user_id');
    const email = urlParams.get('email');
    const firstName = urlParams.get('first_name');
    const fullName = urlParams.get('full_name');
    
    if (clerkUserId) {
      console.log('🎉 Found auth data in URL, storing in extension storage...');
      
      const realUserData = {
        authenticated: true,
        clerkUserId: clerkUserId,
        userId: clerkUserId,
        email: decodeURIComponent(email || ''),
        firstName: decodeURIComponent(firstName || ''),
        fullName: decodeURIComponent(fullName || firstName || email || ''),
        requiresCallback: false
      };
      
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          'northstarAuth': {
            user: realUserData,
            token: null,
            timestamp: Date.now(),
            persistent: true,
            isMinimal: false
          }
        }, () => {
          if (chrome.runtime.lastError) {
            console.log('URL-based auth storage error:', chrome.runtime.lastError.message);
          } else {
            console.log('✅ URL-based auth stored REAL user data:', realUserData);
          }
        });
      }
    }
  }
}

// Simple message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received message:', request);
  
  try {
    if (request.action === 'ping') {
      console.log('🏓 Ping received, sending pong');
      sendResponse({ success: true, message: 'pong' });
      return true;
    }

    if (request.action === 'extractData') {
      console.log('🔍 Extract data request received');
      
      try {
        const extractedData = extractD2LData();
        console.log('📊 Extracted real D2L data:', extractedData);
        sendResponse({ success: true, data: extractedData });
      } catch (error) {
        console.error('❌ Extraction error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }

    if (request.action === 'extractAllData') {
      console.log('🚀 Comprehensive extraction request received');
      
      extractAllDataFromCourse().then(allData => {
        console.log('📊 All data extracted:', allData);
        sendResponse({ 
          success: true, 
          data: allData,
          assignments: allData.assignments,
          courses: allData.courses
        });
      }).catch(error => {
        console.error('❌ Comprehensive extraction error:', error);
        sendResponse({ success: false, error: error.message });
      });
      
      return true; // Keep message channel open for async response
    }

    if (request.action === 'extractAllCourses') {
      console.log('🌟 Multi-course extraction request received');
      
      extractDataFromAllCourses().then(allCoursesData => {
        console.log('📊 All courses data extracted:', allCoursesData);
        sendResponse({ success: true, data: allCoursesData });
      }).catch(error => {
        console.error('❌ Multi-course extraction error:', error);
        sendResponse({ success: false, error: error.message });
      });
      
      return true; // Keep message channel open for async response
    }

    if (request.action === 'getData') {
      console.log('📋 Get data request received');
      sendResponse({ success: true, data: null });
      return true;
    }
    
    console.log('❓ Unknown action:', request.action);
    sendResponse({ success: false, error: 'Unknown action' });
    return true;
    
  } catch (error) {
    console.error('❌ Content script message handler error:', error);
    sendResponse({ success: false, error: error.message });
    return true;
  }
});

console.log('✅ Simple content script initialized and ready');

// Real D2L data extraction function
function extractD2LData() {
  console.log('🔍 Starting real D2L data extraction...');
  
  const data = {
    userInfo: extractUserInfo(),
    courses: extractCourses(),
    assignments: extractAssignments(),
    announcements: []
  };
  
  console.log('📊 Extraction complete:', data);
  return data;
}

function extractUserInfo() {
  console.log('👤 Extracting user info...');
  
  if (!document || !document.querySelector) {
    console.log('👤 Document not ready for user extraction');
    return null;
  }
  
  // Try to find user name in various places
  const selectors = [
    '.d2l-navigation-s-profile-menu button',
    '.d2l-navigation-header-right button',
    '[data-region="user-menu"] button',
    '.usermenu .usertext',
    '#user-menu',
    '.user-info',
    '.profile-link'
  ];
  
  let userName = null;
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      userName = element.textContent.trim();
      console.log(`👤 Found user name with selector "${selector}": "${userName}"`);
      break;
    }
  }
  
  return userName ? { fullName: userName } : null;
}

function extractCourses() {
  console.log('📚 Extracting courses...');
  
  if (!document || !document.querySelector) {
    console.log('📚 Document not ready for course extraction');
    return [];
  }
  
  const courses = [];
  
  // Try to extract orgUnitId from URL
  const urlMatch = window.location.href.match(/ou=(\d+)/);
  const currentOrgUnitId = urlMatch ? urlMatch[1] : null;
  
  if (currentOrgUnitId) {
    console.log('📚 Found current course orgUnitId:', currentOrgUnitId);
    
    // Get course info for current course
    const courseInfo = extractCurrentCourseInfo(currentOrgUnitId);
    if (courseInfo) {
      courses.push(courseInfo);
    }
  }
  
  console.log(`📚 Total courses extracted: ${courses.length}`);
  return courses;
}

function extractCurrentCourseInfo(orgUnitId) {
  console.log('📚 Extracting current course info for orgUnitId:', orgUnitId);
  
  // Try to get course name from page title or breadcrumbs
  let courseName = null;
  
  // Method 1: Page title
  const title = document.title;
  if (title && !title.includes('Brightspace')) {
    const cleanTitle = title.replace(/\s*-\s*Brightspace.*$/, '').trim();
    if (cleanTitle && cleanTitle.length > 0) {
      courseName = cleanTitle;
      console.log('📚 Found course in title:', courseName);
      return {
        orgUnitId: orgUnitId,
        name: courseName,
        code: extractCourseCode(courseName),
        url: window.location.origin + `/d2l/home/${orgUnitId}`,
        source: 'page_title'
      };
    }
  }
  
  // Method 2: Breadcrumb or heading
  const headingSelectors = ['h1', '.d2l-page-title', '.d2l-heading', '.page-title'];
  for (const selector of headingSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      courseName = element.textContent.trim();
      if (courseName.length > 3) {
        console.log('📚 Found course in heading:', courseName);
        return {
          orgUnitId: orgUnitId,
          name: courseName,
          code: extractCourseCode(courseName),
          url: window.location.origin + `/d2l/home/${orgUnitId}`,
          source: 'page_heading'
        };
      }
    }
  }
  
  // Method 3: Fallback - create basic course info
  console.log('📚 Using fallback course info');
  return {
    orgUnitId: orgUnitId,
    name: `Course ${orgUnitId}`,
    code: `COURSE-${orgUnitId}`,
    url: window.location.origin + `/d2l/home/${orgUnitId}`,
    source: 'fallback'
  };
}

function extractCourseCode(text) {
  const codeMatch = text.match(/([A-Z]{2,4}[\s\-_]?\d{3,4})/i);
  return codeMatch ? codeMatch[1] : text.split(' ')[0];
}

function extractAssignments() {
  console.log('📝 Extracting assignments from current page...');
  
  if (!document || !document.querySelector) {
    console.log('📝 Document not ready for assignment extraction');
    return [];
  }
  
  const assignments = [];
  const currentOrgUnitId = window.location.href.match(/ou=(\d+)/)?.[1];
  
  // Look for assignment links and dropbox items
  const assignmentSelectors = [
    'a[href*="dropbox"]',
    'a[href*="assignment"]',
    '.d2l-assignment-link',
    '.assignment-item',
    'tr td a[href*="dropbox"]'
  ];
  
  assignmentSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element, index) => {
      const name = element.textContent.trim();
      const href = element.getAttribute('href');
      
      if (name && name.length > 3 && href) {
        // Try to find due date in nearby elements
        let dueDate = null;
        const parent = element.closest('tr') || element.closest('div');
        if (parent) {
          const dateMatch = parent.textContent.match(/Due on (\w+ \d{1,2}, \d{4})/i);
          if (dateMatch) {
            dueDate = dateMatch[1];
          }
        }
        
        assignments.push({
          name: name,
          dueDate: dueDate,
          type: 'assignment',
          courseOrgUnitId: currentOrgUnitId,
          submissionStatus: 'unknown',
          url: href.startsWith('http') ? href : window.location.origin + href
        });
      }
    });
  });
  
  console.log(`📝 Total assignments extracted: ${assignments.length}`);
  return assignments;
}

// Comprehensive extraction function
async function extractAllDataFromCourse() {
  console.log('🚀 Starting comprehensive data extraction...');
  
  const urlMatch = window.location.href.match(/ou=(\d+)/);
  const orgUnitId = urlMatch ? urlMatch[1] : null;
  
  if (!orgUnitId) {
    console.log('❌ No orgUnitId found in URL');
    return { assignments: [], courses: [], extractionLog: ['❌ No course ID found'] };
  }
  
  const allData = {
    assignments: [],
    courses: [],
    extractionLog: [`✅ Starting extraction for course ${orgUnitId}`]
  };
  
  // Add current page data
  const currentData = extractD2LData();
  allData.assignments = currentData.assignments || [];
  allData.courses = currentData.courses || [];
  allData.extractionLog.push(`✅ Extracted from current page: ${window.location.pathname}`);
  
  console.log('🎉 Comprehensive extraction complete:', allData);
  return allData;
}

// Multi-course extraction function
async function extractDataFromAllCourses() {
  console.log('🌟 Starting multi-course data extraction...');
  
  const combinedData = {
    assignments: [],
    courses: [],
    extractionLog: ['🌟 Starting multi-course extraction']
  };
  
  // For now, just return current course data
  const currentData = await extractAllDataFromCourse();
  combinedData.assignments = currentData.assignments;
  combinedData.courses = currentData.courses;
  combinedData.extractionLog = combinedData.extractionLog.concat(currentData.extractionLog);
  
  console.log('🎉 Multi-course extraction complete:', combinedData);
  return combinedData;
}

