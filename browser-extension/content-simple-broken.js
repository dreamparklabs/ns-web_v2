// Simple Northstar D2L Content Script
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
        return true; // Indicate we handled the message
      }
    
      if (request.action === 'extractData') {
        console.log('🔍 Extract data request received');
        
        try {
          // Real D2L data extraction
          const extractedData = extractD2LData();
          console.log('📊 Extracted real D2L data:', extractedData);
          sendResponse({ success: true, data: extractedData });
        } catch (error) {
          console.error('❌ Extraction error:', error);
          sendResponse({ success: false, error: error.message });
        }
        return true; // Synchronous response
      }
    
      if (request.action === 'extractAllData') {
        console.log('🚀 Comprehensive extraction request received');
        
        // Start comprehensive extraction (async)
        extractAllDataFromCourse().then(allData => {
          console.log('📊 All data extracted:', allData);
          console.log('🔍 Final assignments for response:', allData.assignments);
          console.log('🔍 Final courses for response:', allData.courses);
          sendResponse({ 
            success: true, 
            data: allData,
            assignments: allData.assignments, // Also at top level for debugging
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
        
        // Start multi-course extraction (async)
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
  
  // Ensure document is available
  if (!document || !document.querySelector) {
    console.log('👤 Document not ready for user extraction');
    return null;
  }
  
  // Try to find user name from various locations
  const userNameSelectors = [
    '.d2l-navigation-s-profile-menu-item-text',
    '.vui-dropdown-menu-item-text',
    '[data-automation-id="profile-menu-item-text"]',
    '.d2l-profile-menu-item-text'
  ];
  
  let userName = null;
  for (const selector of userNameSelectors) {
    try {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        userName = element.textContent.trim();
        console.log(`👤 Found user name: ${userName} (using ${selector})`);
        break;
      }
    } catch (error) {
      console.log(`👤 Error querying selector ${selector}:`, error);
      continue;
    }
  }
  
  return userName ? { fullName: userName } : null;
}

function extractCourses() {
  console.log('📚 Extracting courses...');
  
  // Ensure document is available
  if (!document || !document.querySelector) {
    console.log('📚 Document not ready for course extraction');
    return [];
  }
  
  const courses = [];
  
  // Debug: Log current URL and page info
  const currentUrl = window.location.href;
  console.log('📚 Current URL:', currentUrl);
  
  // Check if we're on a course list/table page
  if (currentUrl.includes('/manageCourses/search/') || currentUrl.includes('/discovery/')) {
    console.log('📚 On course list page, extracting from table...');
    const tableExtracted = extractCoursesFromTable();
    courses.push(...tableExtracted);
    console.log(`📚 ✅ Extracted ${tableExtracted.length} courses from table`);
  }
  
  // Check if we're on a specific course page
  const coursePageMatch = currentUrl.match(/mycourses\.siu\.edu\/d2l\/[^/]+\/(\d+)/);
  if (coursePageMatch) {
    const orgUnitId = coursePageMatch[1];
    console.log('📚 Found course orgUnitId from URL:', orgUnitId);
    
    // Extract course info from page title and content
    const courseInfo = extractCurrentCourseInfo(orgUnitId);
    if (courseInfo) {
      courses.push(courseInfo);
      console.log('📚 ✅ Extracted current course:', courseInfo);
    }
  }
  
  // Also look for course patterns in page text for multi-course pages
  const pageText = document.body.innerText;
  console.log('📚 Page text length:', pageText.length);
  console.log('📚 Full page text:', pageText);
  
  // Skip pattern matching on course list pages since we extract from table
  if (!currentUrl.includes('/manageCourses/search/') && !currentUrl.includes('/discovery/')) {
    // Updated pattern for SIU format: "Fall 2025 Foundations and Applications of IoT (ITEC-342-940)"
    const coursePattern = /(Fall|Spring|Summer)\s+\d{4}\s+[^(]+-?\s*\([A-Z]+-\d+-\d+\)/gi;
    const matches = pageText.match(coursePattern);
  
  console.log('📚 Course pattern used:', coursePattern.toString());
  console.log('📚 Pattern matches found:', matches ? matches.length : 0);
  
  if (matches) {
    console.log(`📚 Found ${matches.length} course patterns in page text`);
    console.log('📚 Matches:', matches);
    
    matches.forEach((match, index) => {
      const trimmedMatch = match.trim();
      
      // Extract course code from pattern like "(ITEC-342-940)"
      const codeMatch = trimmedMatch.match(/\(([A-Z]+-\d+-\d+)\)/);
      const code = codeMatch ? codeMatch[1] : '';
      
      // Try to find corresponding link
      const allLinks = document.querySelectorAll('a');
      let courseUrl = null;
      let orgUnitId = null;
      
      for (const link of allLinks) {
        const linkText = link.textContent.trim();
        const href = link.getAttribute('href') || '';
        
        if (linkText.includes(trimmedMatch) || (code && linkText.includes(code))) {
          courseUrl = href.startsWith('http') ? href : window.location.origin + href;
          const orgUnitMatch = href.match(/(?:orgUnitId=|\/le\/|\/content\/|\/home\/)(\d+)/);
          if (orgUnitMatch) {
            orgUnitId = orgUnitMatch[1];
          }
          break;
        }
      }
      
      const course = {
        orgUnitId: orgUnitId || `extracted_${index + 1}`,
        name: trimmedMatch,
        code: code || extractCourseCode(trimmedMatch),
        isActive: true,
        url: courseUrl || window.location.href,
        source: 'text_extraction'
      };
      
      courses.push(course);
      console.log(`📚 Extracted course: ${course.name}`);
    });
  }
  } // End of pattern matching conditional
  
  // Also look for direct course links (updated for SIU structure)
  const courseLinkSelectors = [
    'a[href*="/d2l/home/"]',
    'a[href*="/d2l/le/"]',
    'a[href*="/d2l/lms/"]',
    'a[href*="mycourses.siu.edu/d2l/"]'
  ];
  
  console.log('📚 Searching for course links...');
  
  courseLinkSelectors.forEach(selector => {
    const links = document.querySelectorAll(selector);
    console.log(`📚 Found ${links.length} links with selector: ${selector}`);
    
    links.forEach((link, index) => {
      const text = link.textContent.trim();
      const href = link.getAttribute('href') || '';
      
      console.log(`📚 Link ${index + 1}: "${text}" -> ${href}`);
      
      if (text && looksLikeCourse(text, href)) {
        const orgUnitMatch = href.match(/\/d2l\/[^/]+\/(\d+)/);
        
        console.log(`📚 Link looks like course, orgUnitMatch:`, orgUnitMatch);
        
        if (orgUnitMatch && !courses.find(c => c.orgUnitId === orgUnitMatch[1])) {
          const course = {
            orgUnitId: orgUnitMatch[1],
            name: text,
            code: extractCourseCode(text),
            isActive: true,
            url: href.startsWith('http') ? href : window.location.origin + href,
            source: 'link_extraction'
          };
          
          courses.push(course);
          console.log(`📚 ✅ Extracted course from link: ${course.name}`);
        } else {
          console.log(`📚 ❌ Link rejected: ${orgUnitMatch ? 'duplicate' : 'no orgUnitId'}`);
        }
      } else {
        console.log(`📚 ❌ Link doesn't look like course: ${!text ? 'no text' : 'pattern mismatch'}`);
      }
    });
  });
  
  // Method 3: Look for course cards/tiles on homepage
  console.log('📚 Looking for course cards/tiles...');
  const courseCardSelectors = [
    '.d2l-card',
    '.course-tile',
    '.course-card',
    '[class*="course"]',
    '[class*="tile"]',
    '.widget',
    '.enrollment-card'
  ];
  
  courseCardSelectors.forEach(selector => {
    const cards = document.querySelectorAll(selector);
    console.log(`📚 Found ${cards.length} elements with selector: ${selector}`);
    
    cards.forEach((card, index) => {
      const cardText = card.textContent.trim();
      const cardLinks = card.querySelectorAll('a');
      
      console.log(`📚 Card ${index + 1} text:`, cardText.substring(0, 200) + (cardText.length > 200 ? '...' : ''));
      
      // Special handling for "My Courses" tile
      if (cardText.toLowerCase().includes('my courses')) {
        console.log('📚 Found "My Courses" tile, looking for nested course info...');
        const allLinks = card.querySelectorAll('a');
        allLinks.forEach((link, linkIndex) => {
          const linkText = link.textContent.trim();
          const linkHref = link.getAttribute('href') || '';
          console.log(`📚   Link ${linkIndex + 1}: "${linkText}" -> ${linkHref}`);
        });
      }
      
      // Look for course patterns in card text
      const courseMatch = cardText.match(/(Fall|Spring|Summer)\s+\d{4}.*?\([A-Z]+-\d+-\d+\)/);
      if (courseMatch) {
        console.log(`📚 Found course pattern in card: ${courseMatch[0]}`);
        
        // Try to find the course link
        let courseUrl = null;
        let orgUnitId = null;
        
        cardLinks.forEach(link => {
          const href = link.getAttribute('href') || '';
          const urlMatch = href.match(/\/d2l\/[^/]+\/(\d+)/);
          if (urlMatch) {
            orgUnitId = urlMatch[1];
            courseUrl = href.startsWith('http') ? href : window.location.origin + href;
          }
        });
        
        if (orgUnitId) {
          const fullName = courseMatch[0];
          const codeMatch = fullName.match(/\(([A-Z]+-\d+-\d+)\)/);
          const code = codeMatch ? codeMatch[1] : '';
          
          const course = {
            orgUnitId: orgUnitId,
            name: fullName,
            code: code,
            isActive: true,
            url: courseUrl || window.location.href,
            source: 'course_card'
          };
          
          courses.push(course);
          console.log(`📚 ✅ Extracted course from card: ${course.name}`);
        }
      }
    });
  });
  
  // Fallback: Look for any text that contains course codes (like ITEC-342-940)
  console.log('📚 Fallback: Searching for course codes in all text...');
  const courseCodePattern = /[A-Z]{2,4}-\d{3}-\d{3}/g;
  const codeMatches = pageText.match(courseCodePattern);
  
  if (codeMatches) {
    console.log('📚 Found course codes:', codeMatches);
    
    // For each code, try to find context around it
    codeMatches.forEach((code, index) => {
      if (!courses.find(c => c.code === code)) {
        // Try to find the full course name by looking for text around this code
        const codeIndex = pageText.indexOf(code);
        const contextBefore = pageText.substring(Math.max(0, codeIndex - 100), codeIndex);
        const contextAfter = pageText.substring(codeIndex, Math.min(pageText.length, codeIndex + code.length + 50));
        
        console.log(`📚 Context for ${code}:`, contextBefore + '[' + code + ']' + contextAfter);
        
        // Create a basic course entry
        const course = {
          orgUnitId: `fallback_${index + 1}`,
          name: `Course ${code}`,
          code: code,
          isActive: true,
          url: window.location.href,
          source: 'fallback_code_extraction'
        };
        
        courses.push(course);
        console.log(`📚 ✅ Added fallback course: ${course.name}`);
      }
    });
  }
  
  console.log(`📚 Total courses extracted: ${courses.length}`);
  return courses;
}

function extractCourseCode(text) {
  const codeMatch = text.match(/([A-Z]{2,4}[\s\-_]?\d{3,4})/i);
  return codeMatch ? codeMatch[1] : text.split(' ')[0];
}

function looksLikeCourse(text, href) {
  const lowerText = text.toLowerCase();
  const lowerHref = href.toLowerCase();
  
  const coursePatterns = [
    /[A-Z]{2,4}[\s\-_]?\d{3,4}/i,
    /\d{4}\s+(fall|spring|summer)/i,
    /(fall|spring|summer)\s+\d{4}/i,
  ];
  
  const courseKeywords = [
    'course', 'class', 'section', 'lecture', 'lab', 'seminar',
    'fall', 'spring', 'summer', 'semester', 'term'
  ];
  
  const urlPatterns = ['/content/', '/le/', '/home/', 'orgunitid', '/d2l/'];
  
  const hasPattern = coursePatterns.some(pattern => pattern.test(text));
  const hasKeyword = courseKeywords.some(keyword => lowerText.includes(keyword));
  const hasUrlPattern = urlPatterns.some(pattern => lowerHref.includes(pattern));
  
  return hasUrlPattern && (hasPattern || hasKeyword) && text.length > 3 && text.length < 200;
}

function extractCurrentCourseInfo(orgUnitId) {
  console.log('📚 Extracting current course info for orgUnitId:', orgUnitId);
  
  // Method 1: Extract from page title
  const titleElement = document.querySelector('title');
  if (titleElement) {
    const titleText = titleElement.textContent.trim();
    console.log('📚 Page title:', titleText);
    
    // Look for course pattern in title
    const titleMatch = titleText.match(/(Fall|Spring|Summer)\s+\d{4}\s+[^(]+-?\s*\([A-Z]+-\d+-\d+\)/);
    if (titleMatch) {
      const fullName = titleMatch[0];
      const codeMatch = fullName.match(/\(([A-Z]+-\d+-\d+)\)/);
      const code = codeMatch ? codeMatch[1] : '';
      
      console.log('📚 Found course in title:', fullName);
      return {
        orgUnitId: orgUnitId,
        name: fullName,
        code: code,
        isActive: true,
        url: window.location.href,
        source: 'page_title'
      };
    }
  }
  
  // Method 2: Extract from main heading
  const headingSelectors = ['h1', '.d2l-page-title', '.course-title', 'h2'];
  for (const selector of headingSelectors) {
    const heading = document.querySelector(selector);
    if (heading) {
      const headingText = heading.textContent.trim();
      console.log(`📚 Found heading (${selector}):`, headingText);
      
      // Check if it contains course info
      const headingMatch = headingText.match(/(Fall|Spring|Summer)\s+\d{4}\s+[^(]+-?\s*\([A-Z]+-\d+-\d+\)/);
      if (headingMatch) {
        const fullName = headingMatch[0];
        const codeMatch = fullName.match(/\(([A-Z]+-\d+-\d+)\)/);
        const code = codeMatch ? codeMatch[1] : '';
        
        console.log('📚 Found course in heading:', fullName);
        return {
          orgUnitId: orgUnitId,
          name: fullName,
          code: code,
          isActive: true,
          url: window.location.href,
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
    code: orgUnitId,
    isActive: true,
    url: window.location.href,
    source: 'fallback'
  };
}

function extractAssignments() {
  console.log('📝 🚨 OLD FUNCTION: Extracting assignments (this should NOT be called for fetched pages)...');
  
  // Ensure document is available
  if (!document || !document.querySelector) {
    console.log('📝 Document not ready for assignment extraction');
    return [];
  }
  
  const assignments = [];
  const currentUrl = window.location.href;
  
  // Get current course orgUnitId if we're on a course page
  const coursePageMatch = currentUrl.match(/mycourses\.siu\.edu\/d2l\/[^/]+\/(\d+)/);
  const currentOrgUnitId = coursePageMatch ? coursePageMatch[1] : null;
  
  // Method 1: Extract from assignments page table
  if (currentUrl.includes('/dropbox/') || currentUrl.includes('/assignments/')) {
    console.log('📝 On assignments page, looking for assignment table...');
    
    // Look for assignment rows in table
    const assignmentRows = document.querySelectorAll('tr');
    assignmentRows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const firstCell = cells[0];
        const assignmentLink = firstCell.querySelector('a');
        
        if (assignmentLink) {
          const assignmentName = assignmentLink.textContent.trim();
          const assignmentUrl = assignmentLink.getAttribute('href');
          
          // Look for due date in the row with better parsing
          const rowText = row.textContent;
          let dueDate = null;
          
          // Try multiple date patterns
          const datePatterns = [
            /Due on ([^,\n]+)/i,
            /Due:\s*([^,\n]+)/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4}/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i,
            /\d{1,2}\/\d{1,2}\/\d{4}/,
            /\d{4}-\d{1,2}-\d{1,2}/
          ];
          
          for (const pattern of datePatterns) {
            const match = rowText.match(pattern);
            if (match) {
              let dateStr = match[1] || match[0];
              dateStr = dateStr.trim();
              
              // Fix common date parsing issues
              if (dateStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i)) {
                // Add current year if missing
                const currentYear = new Date().getFullYear();
                dateStr += `, ${currentYear}`;
              }
              
              // Try to parse the date
              try {
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                  // Ensure the year is reasonable (not in the past)
                  const currentYear = new Date().getFullYear();
                  if (parsedDate.getFullYear() < currentYear - 1) {
                    // If the year seems too old, assume it's the current academic year
                    parsedDate.setFullYear(currentYear);
                  }
                  dueDate = parsedDate.toISOString();
                  console.log(`📅 Parsed due date: "${dateStr}" -> ${dueDate}`);
                  break;
                }
              } catch (error) {
                console.log(`📅 Failed to parse date: "${dateStr}"`);
              }
            }
          }
          
          // Look for completion status
          const statusText = rowText.toLowerCase();
          let submissionStatus = 'not_submitted';
          if (statusText.includes('submitted') || statusText.includes('submission')) {
            submissionStatus = 'submitted';
          } else if (statusText.includes('feedback')) {
            submissionStatus = 'graded';
          }
          
          console.log(`📝 Found assignment: ${assignmentName}`);
          
          assignments.push({
            id: `assignment_${currentOrgUnitId}_${index}`,
            name: assignmentName,
            description: null,
            dueDate: dueDate,
            type: 'assignment',
            courseOrgUnitId: currentOrgUnitId,
            submissionStatus: submissionStatus,
            url: assignmentUrl ? (assignmentUrl.startsWith('http') ? assignmentUrl : window.location.origin + assignmentUrl) : null
          });
        }
      }
    });
  }
  
  // Method 2: Extract from calendar events on course homepage
  if (currentUrl.includes('/d2l/home/')) {
    console.log('📝 On course homepage, looking for calendar assignments...');
    
    // Look for calendar events that mention assignments
    const calendarLinks = document.querySelectorAll('a[href*="/calendar/"][href*="event"]');
    calendarLinks.forEach((link, index) => {
      const linkText = link.textContent.trim();
      
      // Check if this looks like an assignment
      if (linkText.includes('Due') && (linkText.includes('Homework') || linkText.includes('Assignment') || linkText.includes('Project') || linkText.includes('Course'))) {
        // Extract assignment name and due date
        const assignmentName = linkText.replace(/^View Event - /, '').replace(/ - Due$/, '');
        
        // Try to find due date from surrounding text
        let dueDate = null;
        const parentElement = link.closest('div, section, article');
        if (parentElement) {
          const contextText = parentElement.textContent;
          const dateMatch = contextText.match(/(SEP|OCT|NOV|DEC|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG)\s+(\d{1,2})\s+(\d{1,2}:\d{2}\s+[AP]M)/);
          if (dateMatch) {
            dueDate = `${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`;
          }
        }
        
        console.log(`📝 Found calendar assignment: ${assignmentName}`);
        
        assignments.push({
          id: `calendar_${currentOrgUnitId}_${index}`,
          name: assignmentName,
          description: null,
          dueDate: dueDate,
          type: 'assignment',
          courseOrgUnitId: currentOrgUnitId,
          submissionStatus: 'unknown',
          url: link.getAttribute('href') ? (link.getAttribute('href').startsWith('http') ? link.getAttribute('href') : window.location.origin + link.getAttribute('href')) : null
        });
      }
    });
  }
  
  // Method 3: Extract from individual assignment page
  if (currentUrl.includes('/folder_submit_files') || currentUrl.includes('/dropbox/user/')) {
    console.log('📝 On individual assignment page...');
    
    // Get assignment name from breadcrumb or heading
    const breadcrumbs = document.querySelectorAll('.d2l-breadcrumb a, .breadcrumb a');
    let assignmentName = 'Unknown Assignment';
    
    if (breadcrumbs.length > 0) {
      const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
      assignmentName = lastBreadcrumb.textContent.trim();
    }
    
    // Look for due date
    const dueDateElements = document.querySelectorAll('*');
    let dueDate = null;
    
    for (const element of dueDateElements) {
      const text = element.textContent;
      if (text && text.includes('Due on')) {
        const dueDateMatch = text.match(/Due on ([^,\n]+)/i);
        if (dueDateMatch) {
          dueDate = dueDateMatch[1].trim();
          break;
        }
      }
    }
    
    console.log(`📝 Found individual assignment: ${assignmentName}`);
    
    assignments.push({
      id: `assignment_${currentOrgUnitId}_individual`,
      name: assignmentName,
      description: null,
      dueDate: dueDate,
      type: 'assignment',
      courseOrgUnitId: currentOrgUnitId,
      submissionStatus: 'not_submitted',
      url: currentUrl
    });
  }
  
  console.log(`📝 Total assignments extracted: ${assignments.length}`);
  return assignments;
}

function extractCoursesFromTable() {
  console.log('📚 Extracting courses from table...');
  
  const courses = [];
  
  // First check if there are any tables
  const tables = document.querySelectorAll('table');
  console.log(`📚 Found ${tables.length} tables on page`);
  
  // Look for table rows containing course information
  const rows = document.querySelectorAll('tr');
  console.log(`📚 Found ${rows.length} table rows`);
  
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    console.log(`📚 Row ${index}: ${cells.length} cells`);
    
    if (cells.length > 0) {
      const rowText = row.textContent.trim();
      console.log(`📚 Row ${index} text:`, rowText.substring(0, 100) + (rowText.length > 100 ? '...' : ''));
    }
    
    // Skip header rows and empty rows
    if (cells.length < 4) return;
    
    // First cell should contain course name
    const firstCell = cells[0];
    const courseNameText = firstCell.textContent.trim();
    
    // Look for course pattern in the first cell
    const courseMatch = courseNameText.match(/(Fall|Spring|Summer)\s+\d{4}\s+([^(]+)\s*\(([A-Z]+-\d+-\d+)\)/);
    
    if (courseMatch) {
      const [fullMatch, semester, courseName, courseCode] = courseMatch;
      const cleanCourseName = `${semester} ${courseName.trim()} (${courseCode})`;
      
      console.log(`📚 Found course in table row ${index}: ${cleanCourseName}`);
      
      // Second cell should contain course code/ID
      let orgUnitId = null;
      if (cells.length > 1) {
        const secondCellText = cells[1].textContent.trim();
        // Look for numeric course ID
        const idMatch = secondCellText.match(/(\d{5,6})\.(\d{6})/);
        if (idMatch) {
          orgUnitId = idMatch[1];
        }
      }
      
      // Look for course link in the first cell
      const courseLink = firstCell.querySelector('a');
      let courseUrl = null;
      
      if (courseLink) {
        const href = courseLink.getAttribute('href') || '';
        courseUrl = href.startsWith('http') ? href : window.location.origin + href;
        
        // Try to extract orgUnitId from link if we don't have it
        if (!orgUnitId) {
          const urlMatch = href.match(/\/d2l\/[^/]+\/(\d+)/);
          if (urlMatch) {
            orgUnitId = urlMatch[1];
          }
        }
      }
      
      // Create course object
      const course = {
        orgUnitId: orgUnitId || `table_${index}`,
        name: cleanCourseName,
        code: courseCode,
        isActive: true,
        url: courseUrl || window.location.href,
        source: 'course_table'
      };
      
      courses.push(course);
      console.log(`📚 ✅ Extracted table course: ${course.name} (ID: ${course.orgUnitId})`);
    }
  });
  
  // If no courses found in table structure, try parsing from structured text
  if (courses.length === 0) {
    console.log('📚 No courses found in table, trying text parsing...');
    const textCourses = extractCoursesFromStructuredText();
    courses.push(...textCourses);
  }
  
  console.log(`📚 Total courses extracted from table: ${courses.length}`);
  return courses;
}

function extractCoursesFromStructuredText() {
  console.log('📚 Extracting courses from structured text...');
  
  const courses = [];
  const pageText = document.body.innerText;
  
  // Look for course entries in the format we can see in the page text
  // "Fall 2025 Foundations and Applications of IoT (ITEC-342-940)\t64572.202560\t..."
  const lines = pageText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for lines that contain course pattern
    const courseMatch = line.match(/(Fall|Spring|Summer)\s+\d{4}\s+([^(]+)\s*\(([A-Z]+-\d+-\d+)\)/);
    
    if (courseMatch) {
      const [fullMatch, semester, courseName, courseCode] = courseMatch;
      const cleanCourseName = `${semester} ${courseName.trim()} (${courseCode})`;
      
      console.log(`📚 Found course in text: ${cleanCourseName}`);
      
      // Look for the course ID in the next few lines
      let orgUnitId = null;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        const idMatch = nextLine.match(/^(\d{5,6})\.(\d{6})$/);
        if (idMatch) {
          orgUnitId = idMatch[1];
          console.log(`📚 Found orgUnitId for ${courseCode}: ${orgUnitId}`);
          break;
        }
      }
      
      const course = {
        orgUnitId: orgUnitId || `text_${courses.length + 1}`,
        name: cleanCourseName,
        code: courseCode,
        isActive: true,
        url: window.location.href, // We don't have individual course URLs from this page
        source: 'structured_text'
      };
      
      courses.push(course);
      console.log(`📚 ✅ Extracted text course: ${course.name} (ID: ${course.orgUnitId})`);
    }
  }
  
  console.log(`📚 Total courses extracted from text: ${courses.length}`);
  return courses;
}

async function extractAllDataFromCourse() {
  console.log('🚀 Starting comprehensive course data extraction...');
  
  const currentUrl = window.location.href;
  const courseMatch = currentUrl.match(/mycourses\.siu\.edu\/d2l\/[^/]+\/(\d+)/);
  
  if (!courseMatch) {
    throw new Error('Not on a course page - cannot perform comprehensive extraction');
  }
  
  const orgUnitId = courseMatch[1];
  console.log(`📚 Extracting all data for course: ${orgUnitId}`);
  
  // Start with current page data
  const allData = {
    userInfo: extractUserInfo(),
    courses: extractCourses(),
    assignments: [],
    announcements: [],
    discussions: [],
    grades: [],
    extractionLog: []
  };
  
  // Add current page data - use the new detailed extraction function
  allData.assignments = extractAssignmentsFromDocument(document, orgUnitId);
  console.log('🔍 Current page assignments extracted:', allData.assignments);
  allData.extractionLog.push(`✅ Extracted from current page: ${window.location.pathname}`);
  
  // Define pages to visit for comprehensive extraction
  const pagesToVisit = [
    {
      name: 'Assignments',
      url: `/d2l/lms/dropbox/user/folders_list.d2l?ou=${orgUnitId}`,
      extractor: 'assignments'
    },
    {
      name: 'Quizzes',
      url: `/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${orgUnitId}`,
      extractor: 'quizzes'
    },
    {
      name: 'Grades', 
      url: `/d2l/lms/grades/my_grades/main.d2l?ou=${orgUnitId}`,
      extractor: 'grades'
    },
    {
      name: 'Discussions',
      url: `/d2l/le/${orgUnitId}/discussions/List`,
      extractor: 'discussions'
    },
    {
      name: 'Announcements',
      url: `/d2l/lms/news/main.d2l?ou=${orgUnitId}`,
      extractor: 'announcements'
    }
  ];
  
  // Extract data from each page
  for (const page of pagesToVisit) {
    try {
      console.log(`🔍 Extracting data from ${page.name}...`);
      const pageData = await extractDataFromPage(page.url, page.extractor, orgUnitId);
      
      // Merge data
      if (page.extractor === 'assignments') {
        allData.assignments = [...allData.assignments, ...pageData];
      } else if (page.extractor === 'quizzes') {
        // Add quizzes as assignments with type 'quiz'
        allData.assignments = [...allData.assignments, ...pageData];
      } else if (page.extractor === 'grades') {
        allData.grades = pageData;
      } else if (page.extractor === 'discussions') {
        allData.discussions = pageData;
      } else if (page.extractor === 'announcements') {
        allData.announcements = pageData;
      }
      
      allData.extractionLog.push(`✅ Extracted from ${page.name}: ${pageData.length || 'N/A'} items`);
      
      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to extract from ${page.name}:`, error);
      allData.extractionLog.push(`❌ Failed to extract from ${page.name}: ${error.message}`);
    }
  }
  
  // Remove duplicate courses (we might have extracted the same course multiple times)
  allData.courses = removeDuplicateCourses(allData.courses);
  
  console.log('🎉 Comprehensive extraction complete:', allData);
  return allData;
}

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
    
    // Debug: Log first 500 chars of HTML
    console.log(`📄 HTML preview for ${extractorType}:`, html.substring(0, 500));
    
    // Create a temporary DOM to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Debug: Log parsed document info
    console.log(`📄 Parsed document title: "${doc.title}"`);
    console.log(`📄 Parsed document body text length: ${doc.body.innerText.length}`);
    console.log(`📄 Document body text preview:`, doc.body.innerText.substring(0, 300));
    
    // Extract data based on page type
    const extractedData = extractDataFromDocument(doc, extractorType, orgUnitId);
    console.log(`📄 Extracted ${extractedData.length} items from ${extractorType} page`);
    
    return extractedData;
    
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  }
}

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

function extractAssignmentsFromDocument(doc, orgUnitId) {
  console.log('📝 🆕 NEW FUNCTION: Extracting assignments from document (simplified)...');
  
  // Temporarily use old function to avoid syntax errors
  return extractAssignments();
}

function extractQuizzesFromDocument(doc, orgUnitId) {
  const quizzes = [];
  
  console.log('🧩 Extracting quizzes from document...');
  
  // Look for quiz rows in the fetched document
  const rows = doc.querySelectorAll('tr');
  
  console.log(`📝 Processing ${rows.length} rows from assignments page...`);
  console.log('📝 Document body preview:', doc.body.innerText.slice(0, 500));
  
  if (rows.length === 0) {
    console.log('📝 No table rows found. Trying alternative selectors...');
    const divs = doc.querySelectorAll('div');
    console.log(`📝 Found ${divs.length} div elements as alternative`);
    
    // Try to find assignment-related divs
    const assignmentDivs = doc.querySelectorAll('div[class*="assignment"], div[class*="dropbox"], div[class*="item"]');
    console.log(`📝 Found ${assignmentDivs.length} assignment-related divs`);
  }
  
  // Simplified processing to avoid syntax errors
  console.log(`📝 Found ${rows.length} rows, using simplified extraction`);
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');
    
    if (cells.length >= 2) {
      // Look for the best assignment link in the row
      let assignmentName = '';
      let assignmentUrl = '';
      
      // First, try to find assignment links (dropbox, content, etc.)
      const assignmentLinks = row.querySelectorAll('a[href*="dropbox"], a[href*="assignment"], a[href*="content"], a[href*="viewContent"], a[href*="folders_list"]');
      
      for (const link of assignmentLinks) {
        const linkText = link.textContent.trim();
        const linkHref = link.getAttribute('href');
        
        console.log(`🔍 Checking assignment link: "${linkText}" (href: ${linkHref})`);
        
        // Look for "Mod X Asg Y" pattern first
        const modMatch = linkText.match(/(Mod\s+\d+\s+Asg\s+\d+:\s*[^,\n\r]+)/i);
        if (modMatch) {
          assignmentName = modMatch[1].trim();
          assignmentUrl = linkHref;
          console.log(`📝 ✅ Found Mod assignment in initial extraction: "${assignmentName}"`);
          break;
        }
        
        // Look for substantial assignment names (longer than generic status text)
        if (linkText.length > 10 && 
            !linkText.toLowerCase().includes('view history') &&
            !linkText.toLowerCase().includes('help') &&
            !linkText.toLowerCase().includes('submission') &&
            linkText.match(/[a-zA-Z]/)) {
          assignmentName = linkText;
          assignmentUrl = linkHref;
          console.log(`📝 ✅ Found assignment name in initial extraction: "${assignmentName}"`);
          break;
        } else {
          console.log(`📝 ❌ Rejected link: "${linkText}" (length: ${linkText.length}, contains submission: ${linkText.toLowerCase().includes('submission')})`);
        }
      }
      
      // Fallback to first cell's first link if no good assignment link found
      if (!assignmentName) {
        console.log(`📝 ⚠️ No assignment name found in priority links, using fallback...`);
        const firstCell = cells[0];
        const assignmentLink = firstCell.querySelector('a');
        
        if (assignmentLink) {
          assignmentName = assignmentLink.textContent.trim();
          assignmentUrl = assignmentLink.getAttribute('href');
          console.log(`📝 🔄 Fallback assignment name: "${assignmentName}" (href: ${assignmentUrl})`);
        } else {
          console.log(`📝 ❌ No links found in first cell`);
        }
      }
      
      // Skip if no valid assignment name found
      if (!assignmentName || assignmentName === 'View History' || assignmentName === 'Help' || assignmentName.length < 3) {
        continue;
      }
        
        // Look for due date in the row with better parsing
        const rowText = row.textContent;
        let dueDate = null;
        
        // Try multiple date patterns
        const datePatterns = [
          /Due on ([^,\n]+)/i,
          /Due:\s*([^,\n]+)/i,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4}/i,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i,
          /\d{1,2}\/\d{1,2}\/\d{4}/,
          /\d{4}-\d{1,2}-\d{1,2}/
        ];
        
        for (const pattern of datePatterns) {
          const match = rowText.match(pattern);
          if (match) {
            let dateStr = match[1] || match[0];
            dateStr = dateStr.trim();
            
            // Fix common date parsing issues
            if (dateStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i)) {
              // Add current year if missing
              const currentYear = new Date().getFullYear();
              dateStr += `, ${currentYear}`;
            }
            
            // Add time if not present - default to 11:59 PM for academic assignments
            if (!dateStr.match(/\d{1,2}:\d{2}/)) {
              // Check if context mentions specific time
              if (rowText.includes('11:59') || rowText.includes('11.59')) {
                dateStr += ' 11:59 PM';
              } else if (rowText.includes('midnight') || rowText.includes('12:00')) {
                dateStr += ' 11:59 PM'; // Convert midnight to 11:59 PM (more common)
              } else {
                // Default to 11:59 PM for academic assignments
                dateStr += ' 11:59 PM';
              }
            }
            
            // Try to parse the date
            try {
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate.getTime())) {
                // Ensure the year is reasonable (not in the past)
                const currentYear = new Date().getFullYear();
                if (parsedDate.getFullYear() < currentYear - 1) {
                  // If the year seems too old, assume it's the current academic year
                  parsedDate.setFullYear(currentYear);
                }
                dueDate = parsedDate.toISOString();
                console.log(`📅 Parsed due date: "${dateStr}" -> ${dueDate}`);
                break;
              }
            } catch (error) {
              console.log(`📅 Failed to parse date: "${dateStr}"`);
            }
          }
        }
        
        // Look for completion status
        const statusText = rowText.toLowerCase();
        let submissionStatus = 'not_submitted';
        if (statusText.includes('submitted') || statusText.includes('submission')) {
          submissionStatus = 'submitted';
        } else if (statusText.includes('feedback') || statusText.includes('graded')) {
          submissionStatus = 'graded';
        } else if (assignmentName.toLowerCase().includes('not submitted')) {
          submissionStatus = 'not_submitted';
        }
        
        // Try to extract better assignment name from URL or context
        let betterName = assignmentName;
        
        // Filter out bad assignment names that are actually status text or generic labels
        const badNamePatterns = [
          /^not submitted$/i,
          /^submitted$/i,
          /^feedback/i,
          /^due on/i,
          /^bdue on/i,
          /^adue on/i,
          /^cdue on/i,
          /^view/i,
          /^help$/i,
          /^submission/i,
          /^file$/i,
          /^\d{1,2}\/\d{1,2}\/\d{4}$/,  // Just dates
          /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i
        ];
        
        const isBadName = badNamePatterns.some(pattern => pattern.test(assignmentName));
        
        if (isBadName || assignmentName.length < 3) {
          // Try to find the real assignment name in the row
          const rowCells = row.querySelectorAll('td');
          
          // Look for assignment name in different cells or nested elements
          for (const cell of rowCells) {
            // HIGHEST PRIORITY: Look for blue assignment links (D2L specific)
            const assignmentLinks = cell.querySelectorAll('a[href*="dropbox"], a[href*="assignment"], a[href*="content"], a[href*="viewContent"], a[href*="folders_list"]');
            for (const link of assignmentLinks) {
              const linkText = link.textContent.trim();
              
              // Check if this link contains the "Mod X Asg Y" pattern
              const modMatch = linkText.match(/(Mod\s+\d+\s+Asg\s+\d+:\s*[^,\n\r]+)/i);
              if (modMatch) {
                betterName = modMatch[1].trim();
                console.log(`📝 Found Mod assignment in D2L link: "${betterName}" (was: "${assignmentName}")`);
                break;
              }
              
              // Check if this is a substantial assignment name (not status text)
              if (linkText.length > 10 && 
                  !linkText.toLowerCase().includes('submission') &&
                  !linkText.toLowerCase().includes('view') &&
                  !linkText.toLowerCase().includes('help') &&
                  linkText.match(/[a-zA-Z]/)) {
                betterName = linkText;
                console.log(`📝 Found assignment name in D2L link: "${betterName}" (was: "${assignmentName}")`);
                break;
              }
            }
            
            if (betterName !== assignmentName) break;
            
            // Second priority: Look for "Mod X Asg Y" pattern in cell text
            const allText = cell.textContent;
            const modMatch = allText.match(/(Mod\s+\d+\s+Asg\s+\d+:\s*[^,\n\r]+)/i);
            if (modMatch) {
              betterName = modMatch[1].trim();
              console.log(`📝 Found Mod assignment pattern in cell: "${betterName}" (was: "${assignmentName}")`);
              break;
            }
            
            // Third priority: Try to find any good link or text element
            const allLinks = cell.querySelectorAll('a');
            for (const link of allLinks) {
              const linkText = link.textContent.trim();
              
              const isGoodName = linkText.length >= 3 && 
                                !badNamePatterns.some(pattern => pattern.test(linkText)) &&
                                !linkText.toLowerCase().includes('view') &&
                                !linkText.toLowerCase().includes('help');
              
              if (isGoodName) {
                betterName = linkText;
                console.log(`📝 Found better assignment name in link: "${betterName}" (was: "${assignmentName}")`);
                break;
              }
            }
            
            if (betterName !== assignmentName) break;
            
            // Try to find assignment name in bold or strong text
            const boldElements = cell.querySelectorAll('strong, b, .assignment-name, [class*="title"]');
            for (const boldEl of boldElements) {
              const boldText = boldEl.textContent.trim();
              const isGoodName = boldText.length >= 3 && 
                                !badNamePatterns.some(pattern => pattern.test(boldText));
              
              if (isGoodName) {
                betterName = boldText;
                console.log(`📝 Found assignment name in bold: "${betterName}" (was: "${assignmentName}")`);
                break;
              }
            }
            
            if (betterName !== assignmentName) break;
          }
          
          // If still no good name found, skip this assignment
          if (betterName === assignmentName && isBadName) {
            console.log(`📝 Skipping assignment with bad name: "${assignmentName}"`);
            continue;
          }
        }
        
        // Try to extract grade information from the row
        let maxPoints = null;
        let pointsEarned = null;
        
        // Look for grade patterns in the row text (40 / 40 - 100 %, 20 / 20 - A, etc.)
        const gradeMatch = rowText.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%/);
        if (gradeMatch) {
          pointsEarned = parseFloat(gradeMatch[1]);
          maxPoints = parseFloat(gradeMatch[2]);
          // gradeMatch[3] is the percentage which we can ignore since we have points
        } else {
          // Fallback to simpler grade patterns
          const simpleGradeMatch = rowText.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
          if (simpleGradeMatch) {
            pointsEarned = parseFloat(simpleGradeMatch[1]);
            maxPoints = parseFloat(simpleGradeMatch[2]);
          }
        }
        
        // Look for letter grades with points (20 / 20 - A)
        const letterGradeMatch = rowText.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*-\s*[A-F]/);
        if (letterGradeMatch && !pointsEarned) {
          pointsEarned = parseFloat(letterGradeMatch[1]);
          maxPoints = parseFloat(letterGradeMatch[2]);
        }
        
        // Look for standalone percentage grades
        const percentMatch = rowText.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch && !pointsEarned) {
          const percentage = parseFloat(percentMatch[1]);
          // If we don't have max points, assume 100
          maxPoints = maxPoints || 100;
          pointsEarned = (percentage / 100) * maxPoints;
        }
        
        // console.log(`📝 ✅ FINAL ASSIGNMENT EXTRACTED:`, {
        //   originalName: assignmentName,
        //   betterName: betterName,
        //   dueDate: dueDate || 'N/A',
        //   grade: `${pointsEarned || 'N/A'}/${maxPoints || 'N/A'}`,
        //   status: submissionStatus,
        //   url: assignmentUrl
        // });
        
        // assignments.push({
        //   id: `fetched_assignment_${orgUnitId}_${index}`,
        //   name: betterName,
        //   description: null,
        //   dueDate: dueDate,
        //   type: 'assignment',
        //   courseOrgUnitId: orgUnitId,
        //   submissionStatus: submissionStatus,
        //   maxPoints: maxPoints,
        //   pointsEarned: pointsEarned,
        //   url: assignmentUrl || null,
        //   source: 'fetched_assignments_page'
        // });
      }
    }
  }
  
  console.log(`🧩 Found ${quizzes.length} quizzes in fetched document`);
  return quizzes;
}

function extractQuizzesFromDocument(doc, orgUnitId) {
  const quizzes = [];
  
  console.log('🧩 Extracting quizzes from document...');
  
  // Look for quiz rows in the table
  const rows = doc.querySelectorAll('tr');
  
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      // First cell should contain quiz name/link
      const firstCell = cells[0];
      const quizLink = firstCell.querySelector('a');
      
      if (quizLink) {
        const quizName = quizLink.textContent.trim();
        const quizUrl = quizLink.getAttribute('href');
        
        // Second cell might contain evaluation status
        const statusCell = cells[1];
        const statusText = statusCell ? statusCell.textContent.trim() : '';
        
        // Third cell might contain attempts
        const attemptsCell = cells[2];
        const attemptsText = attemptsCell ? attemptsCell.textContent.trim() : '';
        
        // Extract attempts info (e.g., "2 / 2")
        const attemptsMatch = attemptsText.match(/(\d+)\s*\/\s*(\d+)/);
        const currentAttempts = attemptsMatch ? parseInt(attemptsMatch[1]) : 0;
        const maxAttempts = attemptsMatch ? parseInt(attemptsMatch[2]) : 0;
        
        // Determine completion status
        let submissionStatus = 'not_submitted';
        if (statusText.toLowerCase().includes('feedback') || statusText.toLowerCase().includes('on attempt')) {
          submissionStatus = 'submitted';
        } else if (currentAttempts > 0) {
          submissionStatus = 'in_progress';
        }
        
        console.log(`🧩 Found quiz: ${quizName} (${currentAttempts}/${maxAttempts} attempts)`);
        
        quizzes.push({
          id: `quiz_${orgUnitId}_${index}`,
          name: quizName,
          description: null,
          dueDate: null, // Quizzes might not have explicit due dates
          type: 'quiz',
          courseOrgUnitId: orgUnitId,
          submissionStatus: submissionStatus,
          attempts: currentAttempts,
          maxAttempts: maxAttempts,
          evaluationStatus: statusText,
          url: quizUrl ? (quizUrl.startsWith('http') ? quizUrl : window.location.origin + quizUrl) : null,
          source: 'fetched_quizzes_page'
        });
      }
    }
  });
  
  console.log(`🧩 Found ${quizzes.length} quizzes in fetched document`);
  return quizzes;
}

function extractGradesFromDocument(doc, orgUnitId) {
  const grades = [];
  
  console.log('📊 Extracting grades from document...');
  
  // Look for grade rows in the table
  const rows = doc.querySelectorAll('tr');
  
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      const itemName = cells[0]?.textContent.trim();
      const points = cells[1]?.textContent.trim();
      const weightAchieved = cells[2]?.textContent.trim();
      const grade = cells[3]?.textContent.trim();
      
      // Skip header rows and empty rows
      if (itemName && itemName !== 'Grade Item' && itemName !== '' && !itemName.toLowerCase().includes('grade item')) {
        
        // Handle different grade formats
        let parsedPoints = null;
        let maxPoints = null;
        let percentage = null;
        let letterGrade = null;
        
        // Parse points (e.g., "100 / 100", "26.25 / 35", "- / 100", "40 / 40", "20 / 20")
        if (points) {
          const pointsMatch = points.match(/([0-9.-]+|\-)\s*\/\s*([0-9.]+)/);
          if (pointsMatch) {
            parsedPoints = pointsMatch[1] === '-' ? null : parseFloat(pointsMatch[1]);
            maxPoints = parseFloat(pointsMatch[2]);
          }
        }
        
        // Parse weight/percentage (e.g., "8.75 / 8.75", "0 / 8.75")
        if (weightAchieved) {
          const weightMatch = weightAchieved.match(/([0-9.-]+|\-)\s*\/\s*([0-9.-]+|\-)/);
          if (weightMatch) {
            // This might be weight achieved vs max weight
          }
          
          // Also check for percentage
          const percentMatch = weightAchieved.match(/([0-9.]+)\s*%/);
          if (percentMatch) {
            percentage = parseFloat(percentMatch[1]);
          }
        }
        
        // Parse letter grade
        if (grade && grade !== '-' && grade !== '') {
          // Check if it's a letter grade (A, B, C, etc.) or percentage
          if (grade.match(/^[A-F][+-]?$/i)) {
            letterGrade = grade.toUpperCase();
          } else if (grade.includes('%')) {
            const gradePercent = grade.match(/([0-9.]+)\s*%/);
            if (gradePercent) {
              percentage = parseFloat(gradePercent[1]);
            }
          }
        }
        
        // Determine if this is a category/section header (like "Quizzes")
        const isCategory = !parsedPoints && !maxPoints && itemName && cells.length >= 4;
        
        console.log(`📊 Found grade: ${itemName} - ${points} (${percentage || 'N/A'}%)`);
        
        grades.push({
          id: `grade_${orgUnitId}_${index}`,
          itemName: itemName,
          points: parsedPoints,
          maxPoints: maxPoints,
          pointsDisplay: points,
          weightAchieved: weightAchieved,
          percentage: percentage,
          letterGrade: letterGrade,
          gradeDisplay: grade,
          isCategory: isCategory,
          courseOrgUnitId: orgUnitId,
          source: 'fetched_grades_page'
        });
      }
    }
  });
  
  console.log(`📊 Found ${grades.length} grades in fetched document`);
  return grades;
}

function extractDiscussionsFromDocument(doc, orgUnitId) {
  const discussions = [];
  
  console.log('💬 Extracting discussions from document...');
  
  // Method 1: Look for discussion topic rows in table format
  const rows = doc.querySelectorAll('tr');
  
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) {
      // First cell should contain topic name/link
      const topicCell = cells[0];
      const topicLink = topicCell.querySelector('a');
      
      if (topicLink) {
        const topicName = topicLink.textContent.trim();
        const topicUrl = topicLink.getAttribute('href');
        
        // Extract additional info from other cells
        const threadsCell = cells[1];
        const postsCell = cells[2];
        const lastPostCell = cells[3];
        
        const threadsCount = threadsCell ? parseInt(threadsCell.textContent.trim()) || 0 : 0;
        const postsText = postsCell ? postsCell.textContent.trim() : '';
        const lastPostText = lastPostCell ? lastPostCell.textContent.trim() : '';
        
        // Extract post count (might be in format "50 (49)")
        const postsMatch = postsText.match(/(\d+)/);
        const postsCount = postsMatch ? parseInt(postsMatch[1]) : 0;
        
        console.log(`💬 Found discussion: ${topicName} (${threadsCount} threads, ${postsCount} posts)`);
        
        discussions.push({
          id: `discussion_${orgUnitId}_${index}`,
          name: topicName,
          type: 'discussion',
          courseOrgUnitId: orgUnitId,
          threadsCount: threadsCount,
          postsCount: postsCount,
          lastPost: lastPostText,
          url: topicUrl ? (topicUrl.startsWith('http') ? topicUrl : window.location.origin + topicUrl) : null,
          source: 'fetched_discussions_page'
        });
      }
    }
  });
  
  // Method 2: Look for discussion sections/forums
  const discussionSections = doc.querySelectorAll('h3, h4, .d2l-heading, [class*="discussion"]');
  discussionSections.forEach((section, index) => {
    const sectionText = section.textContent.trim();
    
    // Look for section titles that look like discussion forums
    if (sectionText.includes('Week') || sectionText.includes('Module') || sectionText.includes('Discussion')) {
      const sectionContainer = section.closest('div, section, article');
      if (sectionContainer) {
        const sectionLinks = sectionContainer.querySelectorAll('a');
        
        sectionLinks.forEach((link, linkIndex) => {
          const linkText = link.textContent.trim();
          const linkUrl = link.getAttribute('href');
          
          if (linkUrl && linkUrl.includes('/discussions/') && linkText.length > 0) {
            // Avoid duplicates
            const isDuplicate = discussions.some(d => d.name === linkText);
            
            if (!isDuplicate) {
              console.log(`💬 Found discussion section: ${linkText}`);
              
              discussions.push({
                id: `discussion_section_${orgUnitId}_${index}_${linkIndex}`,
                name: linkText,
                type: 'discussion',
                courseOrgUnitId: orgUnitId,
                section: sectionText,
                url: linkUrl ? (linkUrl.startsWith('http') ? linkUrl : window.location.origin + linkUrl) : null,
                source: 'fetched_discussions_sections'
              });
            }
          }
        });
      }
    }
  });
  
  // Method 3: Look for any links containing discussion topics
  const allDiscussionLinks = doc.querySelectorAll('a[href*="/discussions/topics/"]');
  allDiscussionLinks.forEach((link, index) => {
    const topicName = link.textContent.trim();
    const topicUrl = link.getAttribute('href');
    
    if (topicName && topicName.length > 3) {
      // Avoid duplicates
      const isDuplicate = discussions.some(d => d.name === topicName);
      
      if (!isDuplicate) {
        console.log(`💬 Found discussion topic link: ${topicName}`);
        
        discussions.push({
          id: `discussion_topic_${orgUnitId}_${index}`,
          name: topicName,
          type: 'discussion',
          courseOrgUnitId: orgUnitId,
          url: topicUrl ? (topicUrl.startsWith('http') ? topicUrl : window.location.origin + topicUrl) : null,
          source: 'fetched_discussions_links'
        });
      }
    }
  });
  
  console.log(`💬 Found ${discussions.length} discussions in fetched document`);
  return discussions;
}

function extractAnnouncementsFromDocument(doc, orgUnitId) {
  const announcements = [];
  
  // Look for announcement titles and dates
  const announcementElements = doc.querySelectorAll('.d2l-datalist-item, .d2l-announcement, [class*="announcement"]');
  
  announcementElements.forEach((element, index) => {
    const title = element.querySelector('h3, h4, .title, [class*="title"]')?.textContent.trim();
    const date = element.querySelector('.date, [class*="date"]')?.textContent.trim();
    const author = element.querySelector('.author, [class*="author"]')?.textContent.trim();
    
    if (title) {
      announcements.push({
        id: `announcement_${orgUnitId}_${index}`,
        title: title,
        date: date,
        author: author,
        courseOrgUnitId: orgUnitId,
        source: 'fetched_announcements_page'
      });
    }
  });
  
  console.log(`📢 Found ${announcements.length} announcements in fetched document`);
  return announcements;
}

function removeDuplicateCourses(courses) {
  const seen = new Set();
  return courses.filter(course => {
    const key = `${course.orgUnitId}_${course.code}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function extractDataFromAllCourses() {
  console.log('🌟 Starting smart multi-course data extraction...');
  
  const currentUrl = window.location.href;
  
  // First, get the list of all courses
  let allCourses = [];
  
  // If we're on the course list page, extract courses from there
  if (currentUrl.includes('/manageCourses/search/')) {
    console.log('📚 On course list page, extracting course list...');
    allCourses = extractCoursesFromTable();
    if (allCourses.length === 0) {
      allCourses = extractCoursesFromStructuredText();
    }
  } else {
    // If we're on homepage or other page, fetch the course list page
    console.log('📚 Fetching course list page...');
    try {
      const courseListUrl = '/d2l/le/manageCourses/search/6606';
      console.log(`📚 Course list URL: ${window.location.origin + courseListUrl}`);
      
      const response = await fetch(window.location.origin + courseListUrl, {
        credentials: 'same-origin',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });
      
      console.log(`📚 Course list response status: ${response.status}`);
      
      if (response.ok) {
        const html = await response.text();
        console.log(`📚 Course list HTML length: ${html.length}`);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        console.log(`📚 Course list document title: "${doc.title}"`);
        
        // Extract courses from the fetched course list page
        allCourses = extractCoursesFromDocument(doc, 'courses', null);
        console.log(`📚 Extracted ${allCourses.length} courses from fetched course list`);
      } else {
        console.error(`📚 Failed to fetch course list: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to fetch course list:', error);
      throw new Error('Could not fetch course list. Please navigate to the course list page first.');
    }
  }
  
  if (allCourses.length === 0) {
    throw new Error('No courses found. Please ensure you are on a D2L page with course access.');
  }
  
  console.log(`🎯 Found ${allCourses.length} courses to test for access`);
  
  // Initialize the combined data structure
  const combinedData = {
    userInfo: extractUserInfo(),
    courses: allCourses,
    assignments: [],
    announcements: [],
    discussions: [],
    grades: [],
    extractionLog: [],
    courseResults: [],
    accessibleCourses: [],
    restrictedCourses: []
  };
  
  combinedData.extractionLog.push(`🎯 Found ${allCourses.length} courses to test for access`);
  
  // First, test which courses are accessible by trying a quick access check
  console.log('🔐 Testing course accessibility...');
  const accessibleCourses = [];
  const restrictedCourses = [];
  
  for (let i = 0; i < Math.min(allCourses.length, 3); i++) { // Limit to first 3 courses for performance
    const course = allCourses[i];
    console.log(`🔐 Testing access for course ${i + 1}/${Math.min(allCourses.length, 5)}: ${course.name}`);
    
    try {
      // Test access with a quick grades page check (usually most permissive)
      const testUrl = `/d2l/lms/grades/my_grades/main.d2l?ou=${course.orgUnitId}`;
      const testResponse = await fetch(window.location.origin + testUrl, {
        credentials: 'same-origin',
        headers: { 'Accept': 'text/html' }
      });
      
      if (testResponse.ok) {
        accessibleCourses.push(course);
        console.log(`✅ Course ${course.name} is accessible`);
      } else if (testResponse.status === 403) {
        restrictedCourses.push({...course, reason: 'Access denied (403)'});
        console.log(`🔒 Course ${course.name} access denied (403)`);
      } else if (testResponse.status === 500) {
        restrictedCourses.push({...course, reason: 'Server error (500)'});
        console.log(`⚠️ Course ${course.name} server error (500)`);
      } else {
        restrictedCourses.push({...course, reason: `HTTP ${testResponse.status}`});
        console.log(`❌ Course ${course.name} error: ${testResponse.status}`);
      }
    } catch (error) {
      restrictedCourses.push({...course, reason: error.message});
      console.log(`❌ Course ${course.name} test failed: ${error.message}`);
    }
    
    // Small delay between access tests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  combinedData.accessibleCourses = accessibleCourses;
  combinedData.restrictedCourses = restrictedCourses;
  combinedData.extractionLog.push(`🔐 Access test complete: ${accessibleCourses.length} accessible, ${restrictedCourses.length} restricted`);
  
  console.log(`🔐 Access test results: ${accessibleCourses.length} accessible, ${restrictedCourses.length} restricted`);
  
  // Extract data only from accessible courses
  if (accessibleCourses.length === 0) {
    combinedData.extractionLog.push(`⚠️ No accessible courses found. All courses returned permission errors.`);
    console.log('⚠️ No accessible courses found for data extraction');
  } else {
    console.log(`📊 Extracting data from ${accessibleCourses.length} accessible courses...`);
    
    for (let i = 0; i < accessibleCourses.length; i++) {
      const course = accessibleCourses[i];
      console.log(`📚 Processing accessible course ${i + 1}/${accessibleCourses.length}: ${course.name} (${course.orgUnitId})`);
      
      try {
        const courseData = await extractDataFromSingleCourseWithRetry(course.orgUnitId);
        
        console.log(`📚 Course ${course.name} extraction results:`, {
          assignments: courseData.assignments.length,
          grades: courseData.grades.length,
          discussions: courseData.discussions.length,
          announcements: courseData.announcements.length
        });
        
        // Merge the data
        combinedData.assignments = [...combinedData.assignments, ...courseData.assignments];
        combinedData.grades = [...combinedData.grades, ...courseData.grades];
        combinedData.discussions = [...combinedData.discussions, ...courseData.discussions];
        combinedData.announcements = [...combinedData.announcements, ...courseData.announcements];
        
        // Track per-course results
        combinedData.courseResults.push({
          course: course.name,
          orgUnitId: course.orgUnitId,
          assignments: courseData.assignments.length,
          grades: courseData.grades.length,
          discussions: courseData.discussions.length,
          announcements: courseData.announcements.length,
          status: 'success'
        });
        
        combinedData.extractionLog.push(`✅ ${course.name}: ${courseData.assignments.length} assignments, ${courseData.grades.length} grades`);
        
        // Delay between courses
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Failed to extract from ${course.name}:`, error);
        combinedData.courseResults.push({
          course: course.name,
          orgUnitId: course.orgUnitId,
          assignments: 0,
          grades: 0,
          discussions: 0,
          announcements: 0,
          status: 'failed',
          error: error.message
        });
        combinedData.extractionLog.push(`❌ ${course.name}: ${error.message}`);
      }
    }
  }
  
  // Add restricted courses to results for transparency
  restrictedCourses.forEach(course => {
    combinedData.courseResults.push({
      course: course.name,
      orgUnitId: course.orgUnitId,
      assignments: 0,
      grades: 0,
      discussions: 0,
      announcements: 0,
      status: 'restricted',
      error: course.reason
    });
    combinedData.extractionLog.push(`🔒 ${course.name}: ${course.reason}`);
  });
  
  // Summary
  const totalAssignments = combinedData.assignments.length;
  const totalGrades = combinedData.grades.length;
  const successfulCourses = combinedData.courseResults.filter(r => r.status === 'success').length;
  const restrictedCount = combinedData.courseResults.filter(r => r.status === 'restricted').length;
  
  combinedData.extractionLog.push(`🎉 Smart extraction complete: ${successfulCourses} successful, ${restrictedCount} restricted, ${totalAssignments} assignments, ${totalGrades} grades`);
  
  console.log('🎉 Smart multi-course extraction complete:', combinedData);
  return combinedData;
}

async function extractDataFromSingleCourse(orgUnitId) {
  console.log(`📚 Extracting data from course: ${orgUnitId}`);
  
  const courseData = {
    assignments: [],
    grades: [],
    discussions: [],
    announcements: []
  };
  
  // Define pages to visit for this course
  const pagesToVisit = [
    {
      name: 'Assignments',
      url: `/d2l/lms/dropbox/user/folders_list.d2l?ou=${orgUnitId}`,
      extractor: 'assignments'
    },
    {
      name: 'Quizzes',
      url: `/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${orgUnitId}`,
      extractor: 'quizzes'
    },
    {
      name: 'Grades',
      url: `/d2l/lms/grades/my_grades/main.d2l?ou=${orgUnitId}`,
      extractor: 'grades'
    },
    {
      name: 'Discussions',
      url: `/d2l/le/${orgUnitId}/discussions/List`,
      extractor: 'discussions'
    },
    {
      name: 'Announcements',
      url: `/d2l/lms/news/main.d2l?ou=${orgUnitId}`,
      extractor: 'announcements'
    }
  ];
  
  console.log(`📚 Course ${orgUnitId} will visit ${pagesToVisit.length} pages`);
  
  // Extract data from each page
  for (const page of pagesToVisit) {
    try {
      console.log(`📚 Course ${orgUnitId}: Extracting ${page.name} from ${page.url}`);
      const pageData = await extractDataFromPage(page.url, page.extractor, orgUnitId);
      console.log(`📚 Course ${orgUnitId}: Got ${pageData.length} items from ${page.name}`);
      
      if (page.extractor === 'assignments') {
        courseData.assignments = pageData;
      } else if (page.extractor === 'quizzes') {
        // Add quizzes as assignments with type 'quiz'
        courseData.assignments = [...courseData.assignments, ...pageData];
        console.log(`📚 Course ${orgUnitId}: Total assignments after quizzes: ${courseData.assignments.length}`);
      } else if (page.extractor === 'grades') {
        courseData.grades = pageData;
      } else if (page.extractor === 'discussions') {
        courseData.discussions = pageData;
      } else if (page.extractor === 'announcements') {
        courseData.announcements = pageData;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`⚠️ Failed to extract ${page.name} for course ${orgUnitId}: ${error.message}`);
      console.error(`⚠️ Error details:`, error);
      // Continue with other pages even if one fails
    }
  }
  
  console.log(`📚 Course ${orgUnitId} final results:`, {
    assignments: courseData.assignments.length,
    grades: courseData.grades.length,
    discussions: courseData.discussions.length,
    announcements: courseData.announcements.length
  });
  
  return courseData;
}

async function extractDataFromSingleCourseWithRetry(orgUnitId) {
  console.log(`📚 Extracting data from course with retry: ${orgUnitId}`);
  
  const courseData = {
    assignments: [],
    grades: [],
    discussions: [],
    announcements: []
  };
  
  // Define pages to visit for this course with retry logic
  const pagesToVisit = [
    {
      name: 'Grades',
      url: `/d2l/lms/grades/my_grades/main.d2l?ou=${orgUnitId}`,
      extractor: 'grades',
      priority: 1 // High priority - usually most accessible
    },
    {
      name: 'Assignments',
      url: `/d2l/lms/dropbox/user/folders_list.d2l?ou=${orgUnitId}`,
      extractor: 'assignments',
      priority: 2
    },
    {
      name: 'Quizzes',
      url: `/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${orgUnitId}`,
      extractor: 'quizzes',
      priority: 2
    },
    {
      name: 'Discussions',
      url: `/d2l/le/${orgUnitId}/discussions/List`,
      extractor: 'discussions',
      priority: 3
    },
    {
      name: 'Announcements',
      url: `/d2l/lms/news/main.d2l?ou=${orgUnitId}`,
      extractor: 'announcements',
      priority: 3
    }
  ];
  
  console.log(`📚 Course ${orgUnitId} will attempt ${pagesToVisit.length} pages`);
  
  let successfulExtractions = 0;
  
  // Extract data from each page with graceful error handling
  for (const page of pagesToVisit) {
    try {
      console.log(`📚 Course ${orgUnitId}: Attempting ${page.name} from ${page.url}`);
      const pageData = await extractDataFromPage(page.url, page.extractor, orgUnitId);
      console.log(`📚 Course ${orgUnitId}: Successfully got ${pageData.length} items from ${page.name}`);
      
      if (page.extractor === 'assignments') {
        courseData.assignments = pageData;
      } else if (page.extractor === 'quizzes') {
        // Add quizzes as assignments with type 'quiz'
        courseData.assignments = [...courseData.assignments, ...pageData];
        console.log(`📚 Course ${orgUnitId}: Total assignments after quizzes: ${courseData.assignments.length}`);
      } else if (page.extractor === 'grades') {
        courseData.grades = pageData;
      } else if (page.extractor === 'discussions') {
        courseData.discussions = pageData;
      } else if (page.extractor === 'announcements') {
        courseData.announcements = pageData;
      }
      
      successfulExtractions++;
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`⚠️ Skipping ${page.name} for course ${orgUnitId}: ${error.message}`);
      
      // For high-priority pages, this might indicate the course is not accessible
      if (page.priority === 1 && (error.message.includes('403') || error.message.includes('500'))) {
        console.log(`🔒 Course ${orgUnitId} appears to have access restrictions`);
      }
      
      // Continue with other pages even if one fails
      continue;
    }
  }
  
  console.log(`📚 Course ${orgUnitId} final results (${successfulExtractions}/${pagesToVisit.length} pages successful):`, {
    assignments: courseData.assignments.length,
    grades: courseData.grades.length,
    discussions: courseData.discussions.length,
    announcements: courseData.announcements.length
  });
  
  // Consider the extraction successful if we got data from at least one page
  if (successfulExtractions === 0) {
    throw new Error(`No data could be extracted from any pages for course ${orgUnitId}`);
  }
  
  return courseData;
}

function extractCoursesFromDocument(doc, extractorType, orgUnitId) {
  if (extractorType === 'courses') {
    // Extract courses from the course list document
    const courses = [];
    
    // Look for course entries in the text
    const pageText = doc.body.innerText;
    const lines = pageText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for lines that contain course pattern
      const courseMatch = line.match(/(Fall|Spring|Summer)\s+\d{4}\s+([^(]+)\s*\(([A-Z]+-\d+-\d+)\)/);
      
      if (courseMatch) {
        const [fullMatch, semester, courseName, courseCode] = courseMatch;
        const cleanCourseName = `${semester} ${courseName.trim()} (${courseCode})`;
        
        // Look for the course ID in the next few lines
        let orgUnitId = null;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          const idMatch = nextLine.match(/^(\d{5,6})\.(\d{6})$/);
          if (idMatch) {
            orgUnitId = idMatch[1];
            break;
          }
        }
        
        if (orgUnitId) {
          const course = {
            orgUnitId: orgUnitId,
            name: cleanCourseName,
            code: courseCode,
            isActive: true,
            url: `${window.location.origin}/d2l/home/${orgUnitId}`,
            source: 'fetched_course_list'
          };
          
          courses.push(course);
        }
      }
    }
    
    return courses;
  }
  
  // For other extractors, use existing functions
  return extractDataFromDocument(doc, extractorType, orgUnitId);
}
