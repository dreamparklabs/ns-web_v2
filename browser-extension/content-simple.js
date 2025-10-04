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
  
  // Look for assignment links and dropbox items (enhanced for comprehensive extraction)
  const assignmentSelectors = [
    // Assignment page links
    'a[href*="dropbox"]',
    'a[href*="assignment"]', 
    'a[href*="folders_list"]',
    '.d2l-assignment-link',
    '.assignment-item',
    'tr td a[href*="dropbox"]',
    // Course home page selectors
    'a[href*="viewContent"]',
    'a[href*="/content/"]',
    '.d2l-link[href*="dropbox"]',
    '.d2l-link[href*="assignment"]',
    // Grade book and table selectors
    'table tr td:first-child a',
    '.d2l-table tr td:first-child a',
    'tr td:first-child',
    // Discussion selectors
    'a[href*="discussions"]',
    '.d2l-link[href*="discussions"]',
    // General content selectors
    'a[title*="Assignment"]',
    'a[title*="Homework"]',
    'a[title*="Discussion"]',
    'a[title*="Quiz"]',
    // Any table-based links that might be assignments
    'table tr td a[href]'
  ];
  
  console.log('📝 Current page URL:', window.location.href);
  console.log('📝 Current page title:', document.title);
  console.log('📝 Page body text preview:', document.body.innerText.substring(0, 300));
  console.log('📝 Searching for assignments with selectors:', assignmentSelectors);
  
  // Let's also check what links exist on this page
  const allLinks = document.querySelectorAll('a[href]');
  console.log(`📝 Found ${allLinks.length} total links on page`);
  
  // Show first 10 links for debugging
  Array.from(allLinks).slice(0, 10).forEach((link, index) => {
    console.log(`📝 Link ${index}: "${link.textContent.trim()}" -> ${link.href}`);
  });
  
  assignmentSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`📝 Selector "${selector}" found ${elements.length} elements`);
    
    Array.from(elements).forEach((element, index) => {
      const name = element.textContent.trim();
      const href = element.getAttribute('href');
      console.log(`📝 Element ${index}: "${name}" -> ${href}`);
      
      // Filter out common non-assignment text
      const isValidAssignment = name && 
        name.length > 3 && 
        href &&
        !name.match(/^(Not Submitted|Submitted|Unread|View History|\d+\s+Submission|Feedback:|Overall Feedback)$/i) &&
        !name.match(/^\d+\s+(Submission|File)s?,?\s*\d*\s*(File)?s?$/i) &&
        !name.match(/^(Feedback:\s+)?Unread$/i) &&
        !href.includes('feedback') &&
        !href.includes('history') &&
        href.includes('dropbox');
      
      if (isValidAssignment) {
        // Try to find due date in nearby elements
        let dueDate = null;
        const parent = element.closest('tr') || element.closest('div');
        if (parent) {
          const dateMatch = parent.textContent.match(/Due on (\w+ \d{1,2}, \d{4})/i);
          if (dateMatch) {
            dueDate = dateMatch[1];
          }
        }
        
        console.log(`✅ Valid assignment found: "${name}"`);
        assignments.push({
          name: name,
          dueDate: dueDate,
          type: 'assignment',
          courseOrgUnitId: currentOrgUnitId,
          submissionStatus: 'unknown',
          url: href.startsWith('http') ? href : window.location.origin + href
        });
      } else {
        console.log(`❌ Filtered out: "${name}" (not a valid assignment)`);
      }
    });
  });
  
  console.log(`📝 Total assignments extracted: ${assignments.length}`);
  return assignments;
}

// 🤖 GEMINI-FIRST APPROACH: Direct page content analysis
async function extractAllDataFromCourse() {
  console.log('🚀 Starting Gemini-powered comprehensive extraction...');
  
  const urlMatch = window.location.href.match(/ou=(\d+)/);
  const orgUnitId = urlMatch ? urlMatch[1] : null;
  
  if (!orgUnitId) {
    console.log('❌ No orgUnitId found in URL');
    return { assignments: [], courses: [], extractionLog: ['❌ No course ID found'] };
  }
  
  console.log(`🤖 Using Gemini AI to analyze D2L pages for course ${orgUnitId}`);
  
  // Define all D2L pages to analyze
  const pagesToAnalyze = [
    {
      name: 'Current Page',
      url: window.location.href,
      content: document.body.innerText,
      html: document.documentElement.outerHTML.substring(0, 50000) // Limit for API
    },
    {
      name: 'Assignments',
      url: `/d2l/lms/dropbox/user/folders_list.d2l?ou=${orgUnitId}`
    },
    {
      name: 'Grades',
      url: `/d2l/lms/grades/my_grades/main.d2l?ou=${orgUnitId}`
    },
    {
      name: 'Discussions',
      url: `/d2l/le/${orgUnitId}/discussions/List`
    },
    {
      name: 'Quizzes',
      url: `/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${orgUnitId}`
    }
  ];
  
  const allExtractedData = {
    assignments: [],
    courses: [],
    grades: [],
    discussions: [],
    announcements: [],
    extractionLog: [`🤖 Starting Gemini analysis for course ${orgUnitId}`]
  };
  
  // Process each page with Gemini
  for (const page of pagesToAnalyze) {
    try {
      console.log(`🤖 Analyzing ${page.name} with Gemini AI...`);
      
      let pageContent = page.content;
      let pageHtml = page.html;
      
      // Fetch content if not current page
      if (!pageContent) {
        const fetchResult = await fetchPageContent(page.url);
        if (fetchResult.success) {
          pageContent = fetchResult.content;
          pageHtml = fetchResult.html.substring(0, 50000);
        } else {
          console.warn(`⚠️ Could not fetch ${page.name}, skipping...`);
          continue;
        }
      }
      
      // Send to Gemini for comprehensive analysis
      const geminiResult = await analyzePageWithGemini(page.name, page.url, pageContent, pageHtml, orgUnitId);
      
      if (geminiResult.success) {
        // Merge results
        allExtractedData.assignments = [...allExtractedData.assignments, ...(geminiResult.data.assignments || [])];
        allExtractedData.courses = [...allExtractedData.courses, ...(geminiResult.data.courses || [])];
        allExtractedData.grades = [...allExtractedData.grades, ...(geminiResult.data.grades || [])];
        allExtractedData.discussions = [...allExtractedData.discussions, ...(geminiResult.data.discussions || [])];
        
        allExtractedData.extractionLog.push(`🤖 ${page.name}: ${geminiResult.data.assignments?.length || 0} assignments, ${geminiResult.data.grades?.length || 0} grades`);
        console.log(`✅ Gemini analyzed ${page.name}:`, geminiResult.data);
      } else {
        console.warn(`⚠️ Gemini analysis failed for ${page.name}:`, geminiResult.error);
        allExtractedData.extractionLog.push(`⚠️ ${page.name}: Analysis failed - ${geminiResult.error}`);
      }
      
      // Respectful delay between API calls
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error analyzing ${page.name}:`, error);
      allExtractedData.extractionLog.push(`❌ ${page.name}: ${error.message}`);
    }
  }
  
  // Remove duplicates
  allExtractedData.assignments = removeDuplicateAssignments(allExtractedData.assignments);
  allExtractedData.grades = removeDuplicateGrades(allExtractedData.grades);
  
  console.log('🎉 Gemini-powered extraction complete:', allExtractedData);
  console.log(`📊 Final totals: ${allExtractedData.assignments.length} assignments, ${allExtractedData.grades.length} grades, ${allExtractedData.discussions.length} discussions`);
  
  return allExtractedData;
}

// Extract data from a specific page
async function extractDataFromPage(url, extractorType, orgUnitId) {
  console.log(`📄 Fetching data from: ${url}`);
  
  try {
    // Use fetch to get page content
    const response = await fetch(window.location.origin + url, {
      credentials: 'same-origin',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status} for ${url}: ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`📄 Fetched HTML length: ${html.length} chars for ${extractorType}`);
    
    // Create a temporary DOM to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    console.log(`📄 Parsed document title: "${doc.title}"`);
    console.log(`📄 Document body text length: ${doc.body.innerText.length}`);
    
    // Extract data based on page type
    const extractedData = extractDataFromDocument(doc, extractorType, orgUnitId);
    console.log(`📄 Extracted ${extractedData.length} items from ${extractorType} page`);
    
    return extractedData;
    
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  }
}

// Extract data from document based on type
function extractDataFromDocument(doc, extractorType, orgUnitId) {
  console.log(`🔍 Parsing ${extractorType} data from document`);
  
  switch (extractorType) {
    case 'assignments':
      return extractAssignmentsFromDocument(doc, orgUnitId);
    case 'quizzes':
      return extractQuizzesFromDocument(doc, orgUnitId);
    case 'grades':
      return extractGradesFromDocument(doc, orgUnitId);
    case 'discussions':
      return extractDiscussionsFromDocument(doc, orgUnitId);
    case 'announcements':
      return extractAnnouncementsFromDocument(doc, orgUnitId);
    default:
      return [];
  }
}

// Extract assignments from fetched document
function extractAssignmentsFromDocument(doc, orgUnitId) {
  const assignments = [];
  
  console.log('📝 Extracting assignments from fetched document...');
  
  // Look for assignment rows in the table
  const rows = doc.querySelectorAll('tr');
  console.log(`📝 Found ${rows.length} table rows in assignments page`);
  
  Array.from(rows).forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      // Look for assignment links
      const assignmentLinks = row.querySelectorAll('a[href*="dropbox"], a[href*="assignment"]');
      
      Array.from(assignmentLinks).forEach(link => {
        const name = link.textContent.trim();
        const href = link.getAttribute('href');
        
        // Filter out status text and non-assignments
        const isValidAssignment = name && 
          name.length > 3 && 
          !name.includes('View History') &&
          !name.match(/^(Not Submitted|Submitted|Unread|\d+\s+Submission|Feedback:|Overall Feedback)$/i) &&
          !name.match(/^\d+\s+(Submission|File)s?,?\s*\d*\s*(File)?s?$/i) &&
          !name.match(/^(Feedback:\s+)?Unread$/i) &&
          href && 
          href.includes('dropbox');
        
        if (isValidAssignment) {
          // Try to extract due date from row
          const rowText = row.textContent;
          const dueDateMatch = rowText.match(/Due on ([^,\n]+)/i);
          const dueDate = dueDateMatch ? dueDateMatch[1] : null;
          
          // Check submission status
          let submissionStatus = 'not_submitted';
          if (rowText.toLowerCase().includes('submitted')) {
            submissionStatus = 'submitted';
          }
          
          assignments.push({
            name: name,
            dueDate: dueDate,
            type: 'assignment',
            courseOrgUnitId: orgUnitId,
            submissionStatus: submissionStatus,
            url: href ? (href.startsWith('http') ? href : window.location.origin + href) : null,
            source: 'fetched_assignments_page'
          });
          
          console.log(`📝 Found assignment: "${name}" (Due: ${dueDate || 'N/A'})`);
        } else {
          console.log(`❌ Filtered out fetched: "${name}"`);
        }
      });
    }
  });
  
  console.log(`📝 Total assignments extracted from document: ${assignments.length}`);
  return assignments;
}

// Simple extractors for other types
function extractQuizzesFromDocument(doc, orgUnitId) {
  const quizzes = [];
  console.log('🧩 Extracting quizzes from document...');
  
  // Look for quiz links
  const quizLinks = doc.querySelectorAll('a[href*="quiz"], a[href*="test"]');
  Array.from(quizLinks).forEach(link => {
    const name = link.textContent.trim();
    const href = link.getAttribute('href');
    
    if (name && name.length > 3) {
      quizzes.push({
        name: name,
        type: 'quiz',
        courseOrgUnitId: orgUnitId,
        url: href ? (href.startsWith('http') ? href : window.location.origin + href) : null,
        source: 'fetched_quizzes_page'
      });
    }
  });
  
  console.log(`🧩 Total quizzes extracted: ${quizzes.length}`);
  return quizzes;
}

function extractGradesFromDocument(doc, orgUnitId) {
  const grades = [];
  console.log('📊 Extracting grades from document...');
  
  // Look for grade rows
  const rows = doc.querySelectorAll('tr');
  Array.from(rows).forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      const itemName = cells[0]?.textContent.trim();
      const points = cells[1]?.textContent.trim();
      const grade = cells[2]?.textContent.trim();
      
      if (itemName && itemName !== 'Grade Item' && points) {
        grades.push({
          itemName: itemName,
          points: points,
          grade: grade,
          courseOrgUnitId: orgUnitId,
          source: 'fetched_grades_page'
        });
      }
    }
  });
  
  console.log(`📊 Total grades extracted: ${grades.length}`);
  return grades;
}

function extractDiscussionsFromDocument(doc, orgUnitId) {
  const discussions = [];
  console.log('💬 Extracting discussions from document...');
  
  // Look for discussion links
  const discussionLinks = doc.querySelectorAll('a[href*="discussions"]');
  Array.from(discussionLinks).forEach(link => {
    const name = link.textContent.trim();
    const href = link.getAttribute('href');
    
    if (name && name.length > 3) {
      discussions.push({
        name: name,
        type: 'discussion',
        courseOrgUnitId: orgUnitId,
        url: href ? (href.startsWith('http') ? href : window.location.origin + href) : null,
        source: 'fetched_discussions_page'
      });
    }
  });
  
  console.log(`💬 Total discussions extracted: ${discussions.length}`);
  return discussions;
}

function extractAnnouncementsFromDocument(doc, orgUnitId) {
  const announcements = [];
  console.log('📢 Extracting announcements from document...');
  
  // Look for announcement elements
  const announcementElements = doc.querySelectorAll('.d2l-datalist-item, [class*="announcement"]');
  Array.from(announcementElements).forEach(element => {
    const title = element.querySelector('h3, h4, .title')?.textContent.trim();
    const date = element.querySelector('.date')?.textContent.trim();
    
    if (title) {
      announcements.push({
        title: title,
        date: date,
        courseOrgUnitId: orgUnitId,
        source: 'fetched_announcements_page'
      });
    }
  });
  
  console.log(`📢 Total announcements extracted: ${announcements.length}`);
  return announcements;
}

// Clean assignment data using Convex AI
async function cleanAssignmentDataWithAI(assignments, orgUnitId) {
  console.log('🤖 Calling Convex AI to clean assignment data...');
  
  try {
    // Get stored auth data
    const authData = await chrome.storage.local.get(['northstarAuth']);
    if (!authData.northstarAuth || !authData.northstarAuth.user.clerkUserId) {
      throw new Error('No authentication data found');
    }
    
    const clerkUserId = authData.northstarAuth.user.clerkUserId;
    
    // Prepare assignment data for AI cleaning
    const rawAssignmentData = assignments.map((assignment, index) => ({
      id: assignment.url || `assignment_${index}`,
      name: assignment.name,
      dueDate: assignment.dueDate,
      type: assignment.type || 'assignment',
      courseOrgUnitId: orgUnitId,
      maxPoints: assignment.maxPoints || null,
      pointsEarned: assignment.pointsEarned || null,
    }));
    
    console.log('📤 Sending to AI:', rawAssignmentData);
    
    // Call Convex AI cleaning endpoint via Northstar API
    const northstarUrl = 'https://northstar-web.vercel.app'; // Production URL
    const response = await fetch(`${northstarUrl}/api/convex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: 'aiParser:cleanAssignmentDataWithAI',
        args: {
          clerkUserId: clerkUserId,
          rawAssignmentData: rawAssignmentData,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('📥 AI cleaning result:', result);
    
    // Convert cleaned data back to assignment format
    if (result.success && result.cleanedAssignments) {
      const cleanedAssignments = result.cleanedAssignments.map(cleaned => ({
        name: cleaned.name,
        dueDate: cleaned.dueDate,
        type: cleaned.type,
        courseOrgUnitId: cleaned.courseOrgUnitId,
        submissionStatus: cleaned.submissionStatus || 'not_submitted',
        url: cleaned.id,
        maxPoints: cleaned.maxPoints,
        pointsEarned: cleaned.pointsEarned,
        source: 'ai_cleaned'
      }));
      
      return {
        success: true,
        cleanedAssignments: cleanedAssignments,
        totalCleaned: cleanedAssignments.length,
      };
    }
    
    throw new Error('Invalid response from AI cleaning service');
    
  } catch (error) {
    console.error('🤖 AI cleaning failed:', error);
    throw error;
  }
}

// 🤖 Fetch page content for Gemini analysis
async function fetchPageContent(url) {
  try {
    const response = await fetch(window.location.origin + url, {
      credentials: 'same-origin',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    return {
      success: true,
      content: doc.body.innerText,
      html: html
    };
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 🤖 Analyze page content with Gemini AI
async function analyzePageWithGemini(pageName, pageUrl, textContent, htmlContent, orgUnitId) {
  try {
    // Get auth data for API call
    const authData = await chrome.storage.local.get(['northstarAuth']);
    if (!authData.northstarAuth || !authData.northstarAuth.user.clerkUserId) {
      throw new Error('No authentication data found');
    }
    
    const clerkUserId = authData.northstarAuth.user.clerkUserId;
    
    // Prepare content for Gemini (limit size)
    const contentToAnalyze = textContent.substring(0, 15000); // Limit for API
    const htmlToAnalyze = htmlContent.substring(0, 10000); // Smaller HTML sample
    
    console.log(`🤖 Sending ${pageName} content to Gemini (${contentToAnalyze.length} chars)...`);
    
    // Call Gemini via Northstar API
    const northstarUrl = 'https://northstar-web.vercel.app';
    const response = await fetch(`${northstarUrl}/api/convex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        function: 'aiParser:parseWithGeminiAction',
        args: {
          content: `PAGE: ${pageName}
URL: ${pageUrl}
COURSE_ID: ${orgUnitId}

TEXT CONTENT:
${contentToAnalyze}

HTML SAMPLE:
${htmlToAnalyze}`,
          contentType: `d2l_${pageName.toLowerCase()}_page`
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`📥 Gemini result for ${pageName}:`, result);
    
    // Process Gemini response
    if (Array.isArray(result) && result.length > 0) {
      return {
        success: true,
        data: {
          assignments: result.filter(item => ['assignment', 'homework', 'quiz', 'discussion', 'project'].includes(item.type)),
          grades: result.filter(item => item.pointsEarned !== undefined || item.maxPoints !== undefined),
          discussions: result.filter(item => item.type === 'discussion'),
          courses: [] // Courses extracted separately
        }
      };
    } else {
      return {
        success: true,
        data: {
          assignments: [],
          grades: [],
          discussions: [],
          courses: []
        }
      };
    }
  } catch (error) {
    console.error(`🤖 Gemini analysis failed for ${pageName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Remove duplicate assignments based on name and due date
function removeDuplicateAssignments(assignments) {
  const seen = new Set();
  return assignments.filter(assignment => {
    const key = `${assignment.title || assignment.name}_${assignment.dueDate}_${assignment.type}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Remove duplicate grades based on item name
function removeDuplicateGrades(grades) {
  const seen = new Set();
  return grades.filter(grade => {
    const key = `${grade.itemName || grade.title}_${grade.maxPoints}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Multi-course extraction function
async function extractDataFromAllCourses() {
  console.log('🌟 Starting multi-course data extraction...');
  
  const combinedData = {
    assignments: [],
    courses: [],
    grades: [],
    discussions: [],
    announcements: [],
    extractionLog: ['🌟 Starting multi-course extraction']
  };
  
  // For now, just return current course data
  const currentData = await extractAllDataFromCourse();
  combinedData.assignments = currentData.assignments;
  combinedData.courses = currentData.courses;
  combinedData.grades = currentData.grades || [];
  combinedData.discussions = currentData.discussions || [];
  combinedData.announcements = currentData.announcements || [];
  combinedData.extractionLog = combinedData.extractionLog.concat(currentData.extractionLog);
  
  console.log('🎉 Multi-course extraction complete:', combinedData);
  return combinedData;
}

// 🔄 AUTO-SYNC FUNCTIONALITY
console.log('🌟 Northstar D2L Sync content script loaded with auto-sync!');

// Detect D2L login and auto-sync
function detectD2LLogin() {
  const isD2LPage = window.location.hostname.includes('d2l') || 
                    window.location.hostname.includes('brightspace') ||
                    window.location.hostname.includes('mycourses');
  
  if (isD2LPage) {
    // Check for login indicators
    const loginIndicators = [
      document.querySelector('[data-userid]'),
      document.querySelector('.d2l-navigation-s-header-username'),
      document.querySelector('.vui-heading-2'),
      document.querySelector('.d2l-homepage'),
      document.querySelector('.d2l-page-title'),
      document.querySelector('.d2l-navigation-s-header')
    ];
    
    const isLoggedIn = loginIndicators.some(indicator => indicator !== null);
    
    if (isLoggedIn) {
      console.log('🔍 D2L login detected, checking for auto-sync...');
      setTimeout(() => checkAutoSyncSettings(), 2000); // Wait for page to fully load
    }
  }
}

// Check auto-sync settings and perform sync if enabled
async function checkAutoSyncSettings() {
  try {
    const settings = await chrome.storage.local.get(['autoSyncEnabled', 'lastAutoSync', 'northstarAuth']);
    
    if (!settings.autoSyncEnabled) {
      console.log('⏸️ Auto-sync is disabled');
      return;
    }
    
    if (!settings.northstarAuth || !settings.northstarAuth.user.clerkUserId) {
      console.log('❌ No Northstar authentication found for auto-sync');
      return;
    }
    
    // Check if we've synced recently (avoid spam)
    const lastSync = settings.lastAutoSync || 0;
    const timeSinceLastSync = Date.now() - lastSync;
    const minSyncInterval = 5 * 60 * 1000; // 5 minutes
    
    if (timeSinceLastSync < minSyncInterval) {
      console.log('⏸️ Auto-sync skipped - synced recently');
      return;
    }
    
    console.log('🚀 Starting automatic D2L sync...');
    showAutoSyncNotification('🔄 Auto-syncing D2L data to Northstar...');
    
    // Perform comprehensive extraction
    const extractedData = await extractAllDataFromCourse();
    
    if (extractedData.assignments.length > 0 || extractedData.grades.length > 0) {
      const syncResult = await performAutoSync(extractedData, settings.northstarAuth.user.clerkUserId);
      
      if (syncResult.success) {
        showAutoSyncNotification(`✅ Auto-sync complete! ${syncResult.totalSynced} items synced`);
        await chrome.storage.local.set({ lastAutoSync: Date.now() });
      } else {
        showAutoSyncNotification('❌ Auto-sync failed - check connection');
      }
    } else {
      console.log('⏸️ No new data found to sync');
    }
    
  } catch (error) {
    console.error('❌ Auto-sync error:', error);
  }
}

// Perform automatic sync to Northstar
async function performAutoSync(extractedData, clerkUserId) {
  try {
    const northstarUrl = 'https://northstar-web.vercel.app';
    
    // Prepare assignments data
    const assignmentsData = extractedData.assignments.map(assignment => ({
      id: assignment.url || `auto_${Date.now()}_${Math.random()}`,
      name: assignment.name || assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      type: assignment.type || 'assignment',
      courseOrgUnitId: assignment.courseOrgUnitId,
      courseName: assignment.courseName || `Course ${assignment.courseOrgUnitId}`,
      submissionStatus: assignment.submissionStatus || 'not_submitted',
      maxPoints: assignment.maxPoints,
      pointsEarned: assignment.pointsEarned
    }));
    
    // Sync to Northstar
    const syncResponse = await fetch(`${northstarUrl}/api/convex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        function: 'd2lScraper:processScrapedAssignmentsWithMatching',
        args: {
          clerkUserId: clerkUserId,
          assignmentsData: assignmentsData
        }
      })
    });
    
    if (syncResponse.ok) {
      const result = await syncResponse.json();
      return {
        success: true,
        totalSynced: result.totalProcessed || assignmentsData.length
      };
    } else {
      throw new Error(`Sync failed: ${syncResponse.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ Auto-sync API error:', error);
    return { success: false, error: error.message };
  }
}

// Show auto-sync notification
function showAutoSyncNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="font-weight: bold;">🌟 Northstar</div>
      <div>${message}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 4000);
}

// Initialize auto-sync detection
document.addEventListener('DOMContentLoaded', detectD2LLogin);
// Also check when page changes (for SPAs)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectD2LLogin);
} else {
  detectD2LLogin();
}

// Monitor for navigation changes in D2L (single page app behavior)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(detectD2LLogin, 1000); // Check after navigation
  }
}).observe(document, { subtree: true, childList: true });
