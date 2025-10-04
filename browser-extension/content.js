// Northstar D2L Content Script
// This script runs on D2L pages to extract course and assignment data

console.log('Northstar D2L Sync: Content script loaded on', window.location.href);

// Prevent multiple initialization
if (window.northstarD2LExtractor) {
  console.log('Northstar D2L Sync: Content script already initialized');
} else {
  console.log('Northstar D2L Sync: Initializing content script...');

class D2LDataExtractor {
  constructor() {
    this.baseUrl = window.location.origin;
    this.extractedData = {
      userInfo: null,
      courses: [],
      assignments: [],
      announcements: []
    };
    
    this.init();
  }

  init() {
    // Wait for page to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.extractData());
    } else {
      this.extractData();
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'ping') {
        sendResponse({ success: true, message: 'Content script active' });
      } else if (request.action === 'extractData') {
        this.extractData().then(() => {
          sendResponse({ success: true, data: this.extractedData });
        }).catch(error => {
          console.error('Extract data error:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // Indicate we will send a response asynchronously
      } else if (request.action === 'getData') {
        sendResponse({ success: true, data: this.extractedData });
      }
    });
  }

  async extractData() {
    try {
      // Extract user information
      this.extractUserInfo();
      
      // Extract data based on current page
      const path = window.location.pathname;
      
      if (path.includes('/home') || path.includes('/dashboard')) {
        await this.extractCoursesFromHomepage();
      } else if (path.includes('/content/') || path.includes('/le/')) {
        this.extractCourseContent();
      } else if (path.includes('/dropbox/') || path.includes('/d2l/lms/dropbox/')) {
        this.extractAssignments();
      } else if (path.includes('/quizzes/') || path.includes('/d2l/lms/quizzing/')) {
        this.extractQuizzes();
      } else if (path.includes('/discussions/') || path.includes('/d2l/le/discussions/')) {
        this.extractDiscussions();
      } else if (path.includes('/news/') || path.includes('/d2l/le/news/')) {
        this.extractAnnouncements();
      }

      // Send data to background script
      chrome.runtime.sendMessage({
        action: 'dataExtracted',
        data: this.extractedData,
        url: window.location.href
      });

      console.log('Northstar D2L Sync: Data extracted', this.extractedData);
    } catch (error) {
      console.error('Northstar D2L Sync: Error extracting data', error);
    }
  }

  extractUserInfo() {
    // Method 1: Extract from widget data (like in console error)
    const pageSource = document.documentElement.outerHTML;
    
    const patterns = {
      userId: /data-ft-user-id[="](\d+)/i,
      firstName: /data-ft-user-first-name[="]([^"&]+)/i,
      lastName: /data-ft-user-last-name[="]([^"&]+)/i,
      email: /data-ft-user-email[="]([^"&]+)/i,
      fullName: /data-ft-user-name[="]([^"&]+)/i,
    };

    const userInfo = {};
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = pageSource.match(pattern);
      if (match && match[1]) {
        userInfo[key] = decodeURIComponent(match[1].replace(/\+/g, ' '));
      }
    }

    // Method 2: Extract from page elements
    const userNameElement = document.querySelector('.d2l-navigation-s-profile-menu-item-text, .vui-dropdown-menu-item-text, [data-automation-id="profile-menu-item-text"]');
    if (userNameElement && !userInfo.fullName) {
      userInfo.fullName = userNameElement.textContent.trim();
    }

    // Method 3: Extract from JavaScript variables
    if (window.D2L && window.D2L.LP && window.D2L.LP.Web && window.D2L.LP.Web.Authentication) {
      const auth = window.D2L.LP.Web.Authentication;
      if (auth.Xsrf && auth.Xsrf.GetTokenValue) {
        userInfo.xsrfToken = auth.Xsrf.GetTokenValue();
      }
    }

    if (Object.keys(userInfo).length > 0) {
      this.extractedData.userInfo = userInfo;
    }
  }

  async extractCoursesFromHomepage() {
    const courses = [];
    console.log('Northstar D2L Sync: Extracting courses from homepage...');

    // Debug: Log all potential course-related elements
    console.log('All links on page:', document.querySelectorAll('a').length);
    console.log('Links with course-like URLs:', document.querySelectorAll('a[href*="/content/"], a[href*="/le/content/"], a[href*="/home/"], a[href*="orgUnitId"]').length);

    // Method 1: Extract from course tiles/cards (expanded selectors including search dropdown)
    const courseTileSelectors = [
      '.d2l-widget-content .d2l-course-tile',
      '.d2l-course-card', 
      '.d2l-enrollment-card',
      '[data-automation-id*="course"]',
      '.course-tile',
      '.enrollment-card',
      '.course-card',
      '.widget-course',
      '.d2l-course-tile',
      // Modern D2L search dropdown selectors
      '.d2l-dropdown-content a',
      '.d2l-menu-item',
      '.d2l-menu-item-link',
      '[role="menuitem"]',
      '.course-search-result',
      '.search-result-item'
    ];
    
    let courseTiles = [];
    courseTileSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        courseTiles = [...courseTiles, ...Array.from(elements)];
      }
    });
    
    courseTiles.forEach(tile => {
      const course = this.extractCourseFromElement(tile);
      if (course) {
        console.log('Extracted course from tile:', course);
        courses.push(course);
      }
    });

    // Method 2: Extract from course links (expanded patterns)
    const courseLinkSelectors = [
      'a[href*="/content/"]',
      'a[href*="/le/content/"]', 
      'a[href*="/home/"]',
      'a[href*="orgUnitId"]',
      'a[href*="/d2l/le/"]',
      'a[href*="/d2l/lms/"]'
    ];
    
    let courseLinks = [];
    courseLinkSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} course links with selector: ${selector}`);
        courseLinks = [...courseLinks, ...Array.from(elements)];
      }
    });
    
    courseLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      const orgUnitMatch = href.match(/(?:orgUnitId=|\/le\/|\/content\/|\/home\/)(\d+)/);
      
      console.log(`Link ${index + 1}:`, {
        href,
        text,
        textLength: text.length,
        orgUnitMatch: orgUnitMatch ? orgUnitMatch[1] : null,
        hasText: !!text,
        element: link.outerHTML.substring(0, 200) + '...'
      });
      
      if (orgUnitMatch && text) {
        const course = {
          orgUnitId: orgUnitMatch[1],
          name: text,
          code: this.extractCourseCode(text),
          isActive: true,
          url: href.startsWith('http') ? href : window.location.origin + href
        };
        
        const existingCourse = courses.find(c => c.orgUnitId === course.orgUnitId);
        if (course.name && !existingCourse) {
          console.log('✓ Extracted course from link:', course);
          courses.push(course);
        } else if (existingCourse) {
          console.log('⚠ Skipped duplicate course:', course.orgUnitId, course.name);
        } else {
          console.log('⚠ Skipped course with no name:', course);
        }
      } else {
        console.log('⚠ Skipped link - no match or no text:', { href, text, hasMatch: !!orgUnitMatch });
      }
    });

    // Method 3: Extract from navigation menu (expanded selectors)
    const navSelectors = [
      '.d2l-navigation-s-course-menu-item',
      '.d2l-course-selector-item',
      '.course-menu-item',
      '.nav-course-item',
      '[class*="course"][class*="menu"]',
      '[class*="course"][class*="nav"]'
    ];
    
    navSelectors.forEach(selector => {
      const navCourses = document.querySelectorAll(selector);
      if (navCourses.length > 0) {
        console.log(`Found ${navCourses.length} nav courses with selector: ${selector}`);
      }
      
      navCourses.forEach(item => {
        const course = this.extractCourseFromElement(item);
        if (course && !courses.find(c => c.orgUnitId === course.orgUnitId)) {
          console.log('Extracted course from nav:', course);
          courses.push(course);
        }
      });
    });

    // Method 4: Extract from page content analysis
    const allLinks = document.querySelectorAll('a');
    console.log(`Analyzing ${allLinks.length} links for course patterns...`);
    
    let patternMatches = 0;
    allLinks.forEach((link, index) => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent.trim();
      
      // Look for course-like patterns in text and URL
      if (text && href && this.looksLikeCourse(text, href)) {
        patternMatches++;
        const orgUnitMatch = href.match(/(?:orgUnitId=|\/le\/|\/content\/|\/home\/)(\d+)/);
        
        console.log(`Pattern match ${patternMatches}:`, {
          text,
          href,
          orgUnitMatch: orgUnitMatch ? orgUnitMatch[1] : null
        });
        
        if (orgUnitMatch) {
          const course = {
            orgUnitId: orgUnitMatch[1],
            name: text,
            code: this.extractCourseCode(text),
            isActive: true,
            url: href.startsWith('http') ? href : window.location.origin + href
          };
          
          const existingCourse = courses.find(c => c.orgUnitId === course.orgUnitId);
          if (!existingCourse) {
            console.log('✓ Extracted course from pattern analysis:', course);
            courses.push(course);
          } else {
            console.log('⚠ Pattern match already exists:', course.orgUnitId);
          }
        }
      }
    });
    
    console.log(`Found ${patternMatches} links matching course patterns`);

    // Method 5: Try to extract from search dropdown if available
    await this.extractFromSearchDropdown(courses);

    // Method 6: Scan all visible text for course patterns (aggressive approach)
    this.scanPageForCoursePatterns(courses);

    console.log(`Total courses extracted: ${courses.length}`);
    this.extractedData.courses = courses;
  }

  extractCourseFromElement(element) {
    const textContent = element.textContent.trim();
    const link = element.querySelector('a') || element;
    const href = link.getAttribute('href') || '';
    
    const orgUnitMatch = href.match(/\/(\d+)\//);
    if (!orgUnitMatch || !textContent) return null;

    return {
      orgUnitId: orgUnitMatch[1],
      name: textContent,
      code: this.extractCourseCode(textContent),
      instructor: this.extractInstructor(element),
      isActive: !element.classList.contains('inactive'),
      url: href
    };
  }

  extractCourseCode(text) {
    // Extract course code patterns like "CS 101", "MATH-250", "ENG_101"
    const codeMatch = text.match(/([A-Z]{2,4}[\s\-_]?\d{3,4})/i);
    return codeMatch ? codeMatch[1] : text.split(' ')[0];
  }

  extractInstructor(element) {
    const instructorElement = element.querySelector('.instructor, .teacher, [class*="instructor"]');
    return instructorElement ? instructorElement.textContent.trim() : null;
  }

  extractAssignments() {
    const assignments = [];
    const currentCourse = this.getCurrentCourseId();

    console.log('Extracting assignments from dropbox page...');

    // Method 1: Extract from dropbox list (enhanced selectors)
    const dropboxSelectors = [
      '.d2l-datalist-item',
      '.d2l-table tbody tr',
      '.dropbox-item',
      '.d2l-assignment-list-item',
      '.assignment-row',
      '.submission-item',
      'tr[data-item-id]',
      '.d2l-grid-row',
      '.assignment-entry'
    ];

    let assignmentRows = [];
    dropboxSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} dropbox items with selector: ${selector}`);
        assignmentRows = [...assignmentRows, ...Array.from(elements)];
      }
    });

    // Remove duplicates based on element reference
    assignmentRows = [...new Set(assignmentRows)];
    
    assignmentRows.forEach((row, index) => {
      const assignment = this.extractAssignmentFromRow(row, 'dropbox');
      if (assignment) {
        assignment.courseOrgUnitId = currentCourse;
        console.log(`✓ Extracted dropbox assignment ${index + 1}:`, assignment);
        assignments.push(assignment);
      } else {
        console.log(`⚠ Could not extract assignment from row ${index + 1}`);
      }
    });

    // Method 2: Extract from assignment links on content pages
    if (assignments.length === 0) {
      console.log('No dropbox assignments found, trying content page extraction...');
      this.extractAssignmentsFromContentPage(assignments, currentCourse);
    }

    // Method 3: Extract from calendar/agenda views
    this.extractAssignmentsFromCalendar(assignments, currentCourse);

    // Method 4: Extract from gradebook if available
    this.extractAssignmentsFromGradebook(assignments, currentCourse);

    console.log(`Total assignments extracted: ${assignments.length}`);
    this.extractedData.assignments = [...this.extractedData.assignments, ...assignments];
  }

  extractQuizzes() {
    const quizzes = [];
    const currentCourse = this.getCurrentCourseId();

    const quizRows = document.querySelectorAll('.d2l-datalist-item, .d2l-table tbody tr, .quiz-item');
    
    quizRows.forEach(row => {
      const quiz = this.extractAssignmentFromRow(row, 'quiz');
      if (quiz) {
        quiz.courseOrgUnitId = currentCourse;
        quizzes.push(quiz);
      }
    });

    this.extractedData.assignments = [...this.extractedData.assignments, ...quizzes];
  }

  extractDiscussions() {
    const discussions = [];
    const currentCourse = this.getCurrentCourseId();

    const discussionRows = document.querySelectorAll('.d2l-datalist-item, .d2l-table tbody tr, .discussion-item');
    
    discussionRows.forEach(row => {
      const discussion = this.extractAssignmentFromRow(row, 'discussion');
      if (discussion) {
        discussion.courseOrgUnitId = currentCourse;
        discussions.push(discussion);
      }
    });

    this.extractedData.assignments = [...this.extractedData.assignments, ...discussions];
  }

  extractAssignmentFromRow(row, type) {
    const nameElement = row.querySelector('a, .name, .title, [class*="name"], [class*="title"]');
    const dueDateElement = row.querySelector('.due-date, .end-date, [class*="due"], [class*="date"]');
    const statusElement = row.querySelector('.status, .submission-status, [class*="status"]');
    
    if (!nameElement) return null;

    const name = nameElement.textContent.trim();
    const href = nameElement.getAttribute('href') || '';
    const idMatch = href.match(/\/(\d+)(?:\/|$)/);
    const currentCourseId = this.getCurrentCourseId();

    // Try to find course info for this assignment
    const courseInfo = this.getCurrentCourseInfo();

    // Extract additional details
    const pointsElement = row.querySelector('.points, .max-points, [class*="point"]');
    const maxPoints = pointsElement ? this.parsePoints(pointsElement.textContent.trim()) : null;

    return {
      id: idMatch ? idMatch[1] : `${type}_${Date.now()}_${Math.random()}`,
      name,
      description: this.extractDescription(row),
      dueDate: dueDateElement ? this.parseDueDate(dueDateElement.textContent.trim()) : null,
      type,
      submissionStatus: statusElement ? statusElement.textContent.trim() : null,
      maxPoints,
      courseOrgUnitId: currentCourseId,
      courseName: courseInfo?.name,
      courseCode: courseInfo?.code,
      url: href.startsWith('http') ? href : window.location.origin + href
    };
  }

  extractAssignmentsFromContentPage(assignments, currentCourseId) {
    console.log('Extracting assignments from content page...');
    
    // Look for assignment links in content modules
    const contentSelectors = [
      'a[href*="/dropbox/"]',
      'a[href*="/assignment"]',
      'a[href*="/quiz"]',
      'a[href*="/discussion"]',
      '.d2l-le-TreeAccordionLeaf a',
      '.content-item a',
      '.module-item a'
    ];

    let assignmentLinks = [];
    contentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} content assignment links with selector: ${selector}`);
        assignmentLinks = [...assignmentLinks, ...Array.from(elements)];
      }
    });

    // Remove duplicates
    assignmentLinks = [...new Set(assignmentLinks)];

    assignmentLinks.forEach((link, index) => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent.trim();
      
      if (text && this.looksLikeAssignment(text)) {
        const idMatch = href.match(/\/(\d+)(?:\/|$)/);
        const type = this.determineAssignmentType(href, text);
        
        const assignment = {
          id: idMatch ? idMatch[1] : `content_${Date.now()}_${Math.random()}`,
          name: text,
          description: this.extractDescriptionFromLink(link),
          dueDate: this.extractDueDateFromContext(link),
          type,
          courseOrgUnitId: currentCourseId,
          courseName: this.getCurrentCourseInfo()?.name,
          courseCode: this.getCurrentCourseInfo()?.code,
          url: href.startsWith('http') ? href : window.location.origin + href,
          source: 'content_page'
        };

        console.log(`✓ Extracted content assignment ${index + 1}:`, assignment);
        assignments.push(assignment);
      }
    });
  }

  extractAssignmentsFromCalendar(assignments, currentCourseId) {
    console.log('Extracting assignments from calendar/agenda...');
    
    const calendarSelectors = [
      '.calendar-event',
      '.agenda-item',
      '.d2l-calendar-event',
      '.event-item',
      '[data-event-type="assignment"]',
      '[data-event-type="quiz"]',
      '[data-event-type="discussion"]'
    ];

    let calendarItems = [];
    calendarSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} calendar items with selector: ${selector}`);
        calendarItems = [...calendarItems, ...Array.from(elements)];
      }
    });

    calendarItems.forEach((item, index) => {
      const titleElement = item.querySelector('.title, .event-title, a');
      const dateElement = item.querySelector('.date, .due-date, .event-date');
      
      if (titleElement) {
        const title = titleElement.textContent.trim();
        const href = titleElement.getAttribute('href') || '';
        
        if (this.looksLikeAssignment(title)) {
          const idMatch = href.match(/\/(\d+)(?:\/|$)/);
          const type = this.determineAssignmentType(href, title);
          
          const assignment = {
            id: idMatch ? idMatch[1] : `calendar_${Date.now()}_${Math.random()}`,
            name: title,
            dueDate: dateElement ? this.parseDueDate(dateElement.textContent.trim()) : null,
            type,
            courseOrgUnitId: currentCourseId,
            courseName: this.getCurrentCourseInfo()?.name,
            courseCode: this.getCurrentCourseInfo()?.code,
            url: href.startsWith('http') ? href : window.location.origin + href,
            source: 'calendar'
          };

          console.log(`✓ Extracted calendar assignment ${index + 1}:`, assignment);
          assignments.push(assignment);
        }
      }
    });
  }

  extractAssignmentsFromGradebook(assignments, currentCourseId) {
    console.log('Extracting assignments from gradebook...');
    
    const gradebookSelectors = [
      '.d2l-grades-table tbody tr',
      '.gradebook-row',
      '.grade-item',
      '.assignment-grade-row'
    ];

    let gradeItems = [];
    gradebookSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} gradebook items with selector: ${selector}`);
        gradeItems = [...gradeItems, ...Array.from(elements)];
      }
    });

    gradeItems.forEach((item, index) => {
      const nameElement = item.querySelector('a, .assignment-name, .grade-item-name');
      const gradeElement = item.querySelector('.grade, .points-earned');
      const maxPointsElement = item.querySelector('.max-points, .points-possible');
      
      if (nameElement) {
        const name = nameElement.textContent.trim();
        const href = nameElement.getAttribute('href') || '';
        
        if (this.looksLikeAssignment(name)) {
          const idMatch = href.match(/\/(\d+)(?:\/|$)/);
          const type = this.determineAssignmentType(href, name);
          
          const assignment = {
            id: idMatch ? idMatch[1] : `gradebook_${Date.now()}_${Math.random()}`,
            name,
            type,
            pointsEarned: gradeElement ? this.parsePoints(gradeElement.textContent.trim()) : null,
            maxPoints: maxPointsElement ? this.parsePoints(maxPointsElement.textContent.trim()) : null,
            courseOrgUnitId: currentCourseId,
            courseName: this.getCurrentCourseInfo()?.name,
            courseCode: this.getCurrentCourseInfo()?.code,
            url: href.startsWith('http') ? href : window.location.origin + href,
            source: 'gradebook'
          };

          console.log(`✓ Extracted gradebook assignment ${index + 1}:`, assignment);
          assignments.push(assignment);
        }
      }
    });
  }

  extractDescription(element) {
    const descElement = element.querySelector('.description, .instructions, [class*="desc"]');
    return descElement ? descElement.textContent.trim() : null;
  }

  parseDueDate(dateText) {
    if (!dateText || dateText.toLowerCase().includes('no due date')) return null;
    
    try {
      // Handle various date formats
      const date = new Date(dateText);
      return date.toISOString();
    } catch (error) {
      console.warn('Could not parse date:', dateText);
      return null;
    }
  }

  extractAnnouncements() {
    const announcements = [];
    const currentCourse = this.getCurrentCourseId();

    const announcementItems = document.querySelectorAll('.d2l-datalist-item, .news-item, .announcement-item');
    
    announcementItems.forEach(item => {
      const titleElement = item.querySelector('a, .title, .headline');
      const contentElement = item.querySelector('.content, .body, .description');
      const dateElement = item.querySelector('.date, .posted-date, [class*="date"]');

      if (titleElement) {
        announcements.push({
          id: `announcement_${Date.now()}_${Math.random()}`,
          title: titleElement.textContent.trim(),
          content: contentElement ? contentElement.textContent.trim() : '',
          date: dateElement ? dateElement.textContent.trim() : null,
          courseOrgUnitId: currentCourse
        });
      }
    });

    this.extractedData.announcements = [...this.extractedData.announcements, ...announcements];
  }

  getCurrentCourseId() {
    const urlMatch = window.location.href.match(/\/(\d+)\//);
    return urlMatch ? urlMatch[1] : null;
  }

  getCurrentCourseInfo() {
    // Try to extract course info from page title or breadcrumbs
    const titleElement = document.querySelector('h1, .course-title, [class*="course-name"], .d2l-page-title');
    const breadcrumbElements = document.querySelectorAll('.breadcrumb a, .d2l-breadcrumb a, nav a');
    
    let courseName = null;
    let courseCode = null;

    // Method 1: Extract from page title
    if (titleElement) {
      const titleText = titleElement.textContent.trim();
      courseName = titleText;
      courseCode = this.extractCourseCode(titleText);
    }

    // Method 2: Extract from breadcrumbs
    if (!courseName && breadcrumbElements.length > 0) {
      for (const breadcrumb of breadcrumbElements) {
        const text = breadcrumb.textContent.trim();
        if (this.looksLikeCourse(text, breadcrumb.href || '')) {
          courseName = text;
          courseCode = this.extractCourseCode(text);
          break;
        }
      }
    }

    // Method 3: Extract from URL and match with extracted courses
    const currentCourseId = this.getCurrentCourseId();
    if (currentCourseId && this.extractedData.courses) {
      const matchingCourse = this.extractedData.courses.find(course => 
        course.orgUnitId === currentCourseId
      );
      
      if (matchingCourse) {
        courseName = matchingCourse.name;
        courseCode = matchingCourse.code;
      }
    }

    return courseName ? { name: courseName, code: courseCode } : null;
  }

  extractCourseContent() {
    // Extract content modules and topics
    const contentItems = document.querySelectorAll('.d2l-le-TreeAccordionLeaf, .content-item, .module-item');
    
    contentItems.forEach(item => {
      const text = item.textContent.trim();
      // Look for assignment-like content in module names
      if (this.looksLikeAssignment(text)) {
        const assignment = {
          id: `content_${Date.now()}_${Math.random()}`,
          name: text,
          type: 'assignment',
          courseOrgUnitId: this.getCurrentCourseId(),
          source: 'content'
        };
        
        this.extractedData.assignments.push(assignment);
      }
    });
  }

  looksLikeAssignment(text) {
    const assignmentKeywords = [
      'assignment', 'homework', 'hw', 'quiz', 'test', 'exam',
      'project', 'paper', 'essay', 'report', 'lab', 'discussion',
      'due', 'submit', 'turn in', 'upload'
    ];
    
    const lowerText = text.toLowerCase();
    return assignmentKeywords.some(keyword => lowerText.includes(keyword));
  }

  looksLikeCourse(text, href) {
    const lowerText = text.toLowerCase();
    const lowerHref = href.toLowerCase();
    
    // Common course patterns in text
    const coursePatterns = [
      /[A-Z]{2,4}[\s\-_]?\d{3,4}/i, // CS 101, MATH-250, ENG_101
      /\d{4}\s+(fall|spring|summer)/i, // 2025 Fall
      /(fall|spring|summer)\s+\d{4}/i, // Fall 2025
    ];
    
    // Course keywords in text
    const courseKeywords = [
      'course', 'class', 'section', 'lecture', 'lab', 'seminar',
      'fall', 'spring', 'summer', 'semester', 'term'
    ];
    
    // URL patterns that indicate courses
    const urlPatterns = [
      '/content/', '/le/', '/home/', 'orgunitid', '/d2l/'
    ];
    
    // Check if text matches course patterns
    const hasPattern = coursePatterns.some(pattern => pattern.test(text));
    
    // Check if text contains course keywords
    const hasKeyword = courseKeywords.some(keyword => lowerText.includes(keyword));
    
    // Check if URL looks like a course URL
    const hasUrlPattern = urlPatterns.some(pattern => lowerHref.includes(pattern));
    
    // Must have URL pattern and either a course pattern or keyword
    return hasUrlPattern && (hasPattern || hasKeyword) && text.length > 3 && text.length < 200;
  }

  async extractFromSearchDropdown(existingCourses) {
    console.log('Attempting to extract from search dropdown...');
    
    // Look for search input field
    const searchInput = document.querySelector('input[placeholder*="course"], input[placeholder*="Search"], .search-input, #search-input');
    
    if (searchInput) {
      console.log('Found search input, attempting to trigger dropdown...');
      
      // Try to focus and trigger the dropdown
      searchInput.focus();
      searchInput.click();
      
      // Wait a bit for dropdown to appear
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Look for dropdown content
      const dropdownSelectors = [
        '.d2l-dropdown-content',
        '.dropdown-menu',
        '.search-results',
        '.course-list',
        '.menu-content',
        '[role="menu"]',
        '[role="listbox"]'
      ];
      
      let dropdownFound = false;
      for (const selector of dropdownSelectors) {
        const dropdown = document.querySelector(selector);
        if (dropdown && dropdown.style.display !== 'none') {
          console.log(`Found dropdown with selector: ${selector}`);
          dropdownFound = true;
          
          // Extract courses from dropdown
          const dropdownLinks = dropdown.querySelectorAll('a, [role="menuitem"], .menu-item');
          console.log(`Found ${dropdownLinks.length} items in dropdown`);
          
          dropdownLinks.forEach(link => {
            const text = link.textContent.trim();
            const href = link.getAttribute('href') || '';
            
            if (text && this.looksLikeCourse(text, href)) {
              const orgUnitMatch = href.match(/(?:orgUnitId=|\/le\/|\/content\/|\/home\/)(\d+)/);
              
              if (orgUnitMatch) {
                const course = {
                  orgUnitId: orgUnitMatch[1],
                  name: text,
                  code: this.extractCourseCode(text),
                  isActive: true,
                  url: href.startsWith('http') ? href : window.location.origin + href,
                  source: 'dropdown'
                };
                
                if (!existingCourses.find(c => c.orgUnitId === course.orgUnitId)) {
                  console.log('✓ Extracted course from dropdown:', course);
                  existingCourses.push(course);
                }
              }
            }
          });
          
          break;
        }
      }
      
      if (!dropdownFound) {
        console.log('No dropdown found after triggering search');
      }
    } else {
      console.log('No search input found');
    }
  }

  scanPageForCoursePatterns(existingCourses) {
    console.log('Scanning page for course patterns...');
    
    // Look for text that matches course patterns
    const coursePattern = /(Fall|Spring|Summer)\s+\d{4}\s+[^-\n]+-?\s*\([A-Z]+-\d+-\d+\)/gi;
    const pageText = document.body.innerText;
    
    const matches = pageText.match(coursePattern);
    if (matches) {
      console.log(`Found ${matches.length} course pattern matches in page text`);
      
      matches.forEach(match => {
        const trimmedMatch = match.trim();
        
        // Extract course code from pattern like "(ITEC-342-940)"
        const codeMatch = trimmedMatch.match(/\(([A-Z]+-\d+-\d+)\)/);
        const code = codeMatch ? codeMatch[1] : '';
        
        // Try to find a corresponding link for this course
        const allLinks = document.querySelectorAll('a');
        let courseLink = null;
        
        for (const link of allLinks) {
          const linkText = link.textContent.trim();
          const href = link.getAttribute('href') || '';
          
          // Check if link text contains the course pattern or code
          if (linkText.includes(trimmedMatch) || (code && linkText.includes(code))) {
            courseLink = link;
            break;
          }
          
          // Check if href contains identifiable course ID
          if (href.includes('/le/') || href.includes('/content/') || href.includes('orgUnitId')) {
            const similarity = this.calculateTextSimilarity(linkText, trimmedMatch);
            if (similarity > 0.7) {
              courseLink = link;
              break;
            }
          }
        }
        
        if (courseLink) {
          const href = courseLink.getAttribute('href') || '';
          const orgUnitMatch = href.match(/(?:orgUnitId=|\/le\/|\/content\/|\/home\/)(\d+)/);
          
          if (orgUnitMatch) {
            const course = {
              orgUnitId: orgUnitMatch[1],
              name: trimmedMatch,
              code: code || this.extractCourseCode(trimmedMatch),
              isActive: true,
              url: href.startsWith('http') ? href : window.location.origin + href,
              source: 'page_scan'
            };
            
            if (!existingCourses.find(c => c.orgUnitId === course.orgUnitId)) {
              console.log('✓ Extracted course from page scan:', course);
              existingCourses.push(course);
            }
          }
        } else {
          console.log(`⚠ Found course pattern "${trimmedMatch}" but no corresponding link`);
        }
      });
    } else {
      console.log('No course patterns found in page text');
    }
  }

  calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  // Helper methods for enhanced assignment extraction
  parsePoints(pointsText) {
    if (!pointsText) return null;
    
    // Extract numeric value from text like "10 points", "15/20", "85%"
    const match = pointsText.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  determineAssignmentType(href, text) {
    const lowerHref = href.toLowerCase();
    const lowerText = text.toLowerCase();
    
    if (lowerHref.includes('quiz') || lowerText.includes('quiz')) return 'quiz';
    if (lowerHref.includes('discussion') || lowerText.includes('discussion')) return 'discussion';
    if (lowerHref.includes('dropbox') || lowerText.includes('assignment')) return 'assignment';
    if (lowerText.includes('exam') || lowerText.includes('test')) return 'exam';
    if (lowerText.includes('project')) return 'project';
    if (lowerText.includes('homework') || lowerText.includes('hw')) return 'homework';
    if (lowerText.includes('lab')) return 'lab';
    if (lowerText.includes('paper') || lowerText.includes('essay')) return 'paper';
    
    return 'assignment'; // default
  }

  extractDescriptionFromLink(linkElement) {
    // Try to find description in nearby elements
    const parent = linkElement.parentElement;
    if (!parent) return null;
    
    const descSelectors = [
      '.description',
      '.instructions',
      '.content',
      '.summary',
      '[class*="desc"]'
    ];
    
    for (const selector of descSelectors) {
      const descElement = parent.querySelector(selector);
      if (descElement) {
        return descElement.textContent.trim();
      }
    }
    
    // Try sibling elements
    const nextSibling = linkElement.nextElementSibling;
    if (nextSibling && nextSibling.textContent.trim().length > 10) {
      return nextSibling.textContent.trim();
    }
    
    return null;
  }

  extractDueDateFromContext(linkElement) {
    // Look for due date information near the assignment link
    const parent = linkElement.parentElement;
    if (!parent) return null;
    
    const dateSelectors = [
      '.due-date',
      '.end-date',
      '.deadline',
      '[class*="due"]',
      '[class*="date"]'
    ];
    
    for (const selector of dateSelectors) {
      const dateElement = parent.querySelector(selector);
      if (dateElement) {
        return this.parseDueDate(dateElement.textContent.trim());
      }
    }
    
    // Look for date patterns in the text content
    const textContent = parent.textContent;
    const datePatterns = [
      /due[:\s]+([^,\n]+)/i,
      /deadline[:\s]+([^,\n]+)/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{2,4}/i
    ];
    
    for (const pattern of datePatterns) {
      const match = textContent.match(pattern);
      if (match) {
        return this.parseDueDate(match[1] || match[0]);
      }
    }
    
    return null;
  }
}

// Initialize the extractor and store reference to prevent duplicates
window.northstarD2LExtractor = new D2LDataExtractor();
console.log('Northstar D2L Sync: Content script fully initialized');

}
