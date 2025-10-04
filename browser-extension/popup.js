// Northstar D2L Sync Extension Popup

class NorthstarSync {
  constructor() {
    this.extractedData = null;
    this.northstarUrl = 'http://localhost:5173';
    
    this.init();
  }

  init() {
    // DOM elements
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.coursesCount = document.getElementById('courses-count');
    this.assignmentsCount = document.getElementById('assignments-count');
    this.extractBtn = document.getElementById('extract-btn');
    this.syncBtn = document.getElementById('sync-btn');
    this.openNorthstarBtn = document.getElementById('open-northstar-btn');
    this.messageDiv = document.getElementById('message');
    this.loadingDiv = document.getElementById('loading');
    this.mainContent = document.getElementById('main-content');

    // Event listeners
    this.extractBtn.addEventListener('click', () => this.extractData());
    this.syncBtn.addEventListener('click', () => this.syncToNorthstar());
    this.openNorthstarBtn.addEventListener('click', () => this.openNorthstar());
    document.getElementById('debug-btn').addEventListener('click', () => this.showDebugInfo());
    document.getElementById('help-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });

    // Initialize
    this.checkCurrentTab();
  }

  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (this.isD2LPage(tab.url)) {
        this.setStatus('warning', 'D2L page detected - initializing...');
        await this.getExistingData();
        this.setStatus('success', 'Ready to extract data');
      } else {
        this.setStatus('warning', 'Please navigate to a D2L page');
        this.extractBtn.disabled = true;
      }
    } catch (error) {
      console.error('Error checking tab:', error);
      this.setStatus('error', 'Unable to access current page');
    }
  }

  isD2LPage(url) {
    return url && (
      url.includes('brightspace.com') || 
      url.includes('.siu.edu') ||
      url.includes('/d2l/') ||
      (url.includes('.edu') && url.includes('mycourses'))
    );
  }

  async getExistingData() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Try to get existing data from storage first
      const storageKey = `d2l_data_${tab.id}`;
      const result = await chrome.storage.local.get([storageKey]);
      
      if (result[storageKey] && result[storageKey].data) {
        this.extractedData = result[storageKey].data;
        this.updateStats();
        
        if (this.hasData()) {
          this.syncBtn.style.display = 'block';
        }
      }
      
      // Try to ping content script (no injection, just check)
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getData' });
        if (response && response.success && response.data) {
          this.extractedData = response.data;
          this.updateStats();
          
          if (this.hasData()) {
            this.syncBtn.style.display = 'block';
          }
        }
      } catch (error) {
        console.log('Content script not available yet');
      }
    } catch (error) {
      console.log('No existing data found:', error);
    }
  }

  async extractData() {
    this.showLoading(true);
    this.extractBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      console.log('Attempting to extract data from tab:', tab.id, tab.url);
      
      // Try to communicate with content script
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
        console.log('Content script response:', response);
      } catch (communicationError) {
        console.log('Communication failed, trying to inject content script...');
        
        // Try to inject content script manually
        try {
          await this.injectContentScript(tab.id);
          // Wait for initialization
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try again
          response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
          console.log('Content script response after injection:', response);
        } catch (injectionError) {
          throw new Error('Cannot load content script. Please refresh the D2L page and try again.');
        }
      }

      // Process the response
      if (response && response.success) {
        this.extractedData = response.data;
        this.updateStats();
        
        if (this.hasData()) {
          this.showMessage('Data extracted successfully!', 'success');
          this.syncBtn.style.display = 'block';
          this.setStatus('success', 'Data ready for sync');
        } else {
          this.showMessage('No data found on this page. Try navigating to your D2L homepage or course pages.', 'error');
          this.setStatus('warning', 'No data found');
        }
      } else if (response && !response.success) {
        throw new Error(response.error || 'Extraction failed');
      } else {
        throw new Error('No response from content script');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      let errorMessage = 'Failed to extract data. ';
      
      if (error.message.includes('Cannot load content script') || 
          error.message.includes('Could not establish connection') ||
          error.message.includes('Receiving end does not exist')) {
        errorMessage += 'Please refresh the D2L page (F5 or Cmd+R) and try again.';
      } else {
        errorMessage += 'Make sure you\'re on a D2L page and try refreshing.';
      }
      
      this.showMessage(errorMessage, 'error');
      this.setStatus('error', 'Extraction failed');
    } finally {
      this.showLoading(false);
      this.extractBtn.disabled = false;
    }
  }

  async syncToNorthstar() {
    if (!this.extractedData) {
      this.showMessage('No data to sync. Extract data first.', 'error');
      return;
    }

    this.showLoading(true);
    this.syncBtn.disabled = true;

    try {
      // Check if user is logged into Northstar
      const isLoggedIn = await this.checkNorthstarAuth();
      
      if (!isLoggedIn) {
        this.showMessage('Please log into Northstar first, then try syncing again.', 'error');
        this.openNorthstar();
        return;
      }

      // Sync user info
      if (this.extractedData.userInfo) {
        await this.syncUserInfo();
      }

      // Sync courses
      if (this.extractedData.courses && this.extractedData.courses.length > 0) {
        await this.syncCourses();
      }

      // Sync assignments with intelligent course matching
      let assignmentSyncResult = null;
      if (this.extractedData.assignments && this.extractedData.assignments.length > 0) {
        assignmentSyncResult = await this.syncAssignments();
      }

      // Create detailed success message
      let successMessage = `Successfully synced ${this.extractedData.courses.length} courses`;
      
      if (assignmentSyncResult) {
        const { totalSynced, totalProcessed, matchingResults } = assignmentSyncResult;
        const matchedCount = matchingResults.filter(r => r.matched).length;
        const unmatchedCount = totalProcessed - matchedCount;
        
        successMessage += ` and ${totalSynced} assignments!`;
        
        if (matchedCount > 0) {
          successMessage += ` ${matchedCount} assignments were intelligently matched to existing courses.`;
        }
        
        if (unmatchedCount > 0) {
          successMessage += ` ${unmatchedCount} assignments could not be matched to existing courses.`;
        }
      } else if (this.extractedData.assignments && this.extractedData.assignments.length > 0) {
        successMessage += ` and ${this.extractedData.assignments.length} assignments!`;
      } else {
        successMessage += '!';
      }

      this.showMessage(successMessage, 'success');
      this.setStatus('success', 'Sync completed');

    } catch (error) {
      console.error('Sync error:', error);
      this.showMessage(`Sync failed: ${error.message}`, 'error');
      this.setStatus('error', 'Sync failed');
    } finally {
      this.showLoading(false);
      this.syncBtn.disabled = false;
    }
  }

  async checkNorthstarAuth() {
    try {
      // First check localStorage for recent auth data
      const storedAuth = localStorage.getItem('northstar_extension_auth');
      const receivedAuth = localStorage.getItem('northstar_extension_auth_received');
      
      if (storedAuth || receivedAuth) {
        console.log('🔐 Found stored auth data, assuming authenticated');
        return true;
      }
      
      // Then check via API
      const response = await fetch(`${this.northstarUrl}/api/auth/check`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      console.log('🔐 Auth check response:', response.status);
      return response.ok;
    } catch (error) {
      console.log('🔐 Auth check failed:', error);
      return false;
    }
  }

  async getClerkUserId() {
    try {
      // First try to get from stored auth data
      const storedAuth = localStorage.getItem('northstar_extension_auth');
      const receivedAuth = localStorage.getItem('northstar_extension_auth_received');
      
      if (receivedAuth) {
        const authData = JSON.parse(receivedAuth);
        if (authData.user && authData.user.clerkUserId) {
          console.log('🔐 Using Clerk user ID from received auth data:', authData.user.clerkUserId);
          return authData.user.clerkUserId;
        }
      }
      
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        if (authData.user && authData.user.clerkUserId) {
          console.log('🔐 Using Clerk user ID from stored auth data:', authData.user.clerkUserId);
          return authData.user.clerkUserId;
        }
      }
      
      // Fallback to API call
      const response = await fetch(`${this.northstarUrl}/api/auth/user`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('🔐 Got user data from API:', userData);
        return userData.clerkUserId || userData.userId;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get Clerk user ID:', error);
      return null;
    }
  }

  async syncUserInfo() {
    // This would call the Convex function to store user info
    console.log('Syncing user info:', this.extractedData.userInfo);
    // Implementation depends on your Convex setup
  }

  async syncCourses() {
    // This would call the Convex function to sync courses
    console.log('Syncing courses:', this.extractedData.courses);
    // Implementation depends on your Convex setup
  }

  async syncAssignments() {
    if (!this.extractedData.assignments || this.extractedData.assignments.length === 0) {
      console.log('No assignments to sync');
      return;
    }

    // Get user's Clerk ID for Convex calls
    const clerkUserId = await this.getClerkUserId();
    if (!clerkUserId) {
      throw new Error('User not authenticated with Clerk');
    }

    // Prepare assignment data with course information
    const assignmentsWithCourseInfo = this.extractedData.assignments.map(assignment => {
      // Find the corresponding course from extracted data
      const correspondingCourse = this.extractedData.courses.find(course => 
        course.orgUnitId === assignment.courseOrgUnitId
      );

      return {
        id: assignment.id,
        name: assignment.name,
        description: assignment.description,
        dueDate: assignment.dueDate,
        type: assignment.type || 'assignment',
        courseOrgUnitId: assignment.courseOrgUnitId,
        courseName: correspondingCourse?.name || `Course ${assignment.courseOrgUnitId}`,
        courseCode: correspondingCourse?.code || '',
        submissionStatus: assignment.submissionStatus,
      };
    });

    console.log('Syncing assignments with course matching:', assignmentsWithCourseInfo);

    // Call Convex function with intelligent course matching
    const response = await fetch(`${this.northstarUrl}/api/convex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        function: 'd2lScraper:processScrapedAssignmentsWithMatching',
        args: {
          clerkUserId: clerkUserId,
          assignmentsData: assignmentsWithCourseInfo
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Assignment sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Assignment sync result:', result);

    if (result.success) {
      // Log matching results for user feedback
      result.matchingResults.forEach(match => {
        if (match.matched) {
          console.log(`✓ Matched "${match.assignmentName}" to course "${match.matchInfo.matchedCourseName}" (${match.matchInfo.matchReason}, score: ${match.matchInfo.matchScore})`);
        } else {
          console.log(`⚠ Could not match assignment "${match.assignmentName}" - no suitable course found`);
        }
      });

      return result;
    } else {
      throw new Error('Assignment sync failed');
    }
  }

  hasData() {
    return this.extractedData && (
      (this.extractedData.courses && this.extractedData.courses.length > 0) ||
      (this.extractedData.assignments && this.extractedData.assignments.length > 0) ||
      (this.extractedData.userInfo && Object.keys(this.extractedData.userInfo).length > 0)
    );
  }

  updateStats() {
    if (this.extractedData) {
      this.coursesCount.textContent = this.extractedData.courses ? this.extractedData.courses.length : 0;
      this.assignmentsCount.textContent = this.extractedData.assignments ? this.extractedData.assignments.length : 0;
    }
  }

  setStatus(type, text) {
    this.statusDot.className = `status-dot ${type}`;
    this.statusText.textContent = text;
  }

  showMessage(text, type = 'info') {
    this.messageDiv.innerHTML = `<div class="${type}-message">${text}</div>`;
    
    // Clear message after 5 seconds
    setTimeout(() => {
      this.messageDiv.innerHTML = '';
    }, 5000);
  }

  showLoading(show) {
    if (show) {
      this.loadingDiv.style.display = 'block';
      this.mainContent.style.display = 'none';
    } else {
      this.loadingDiv.style.display = 'none';
      this.mainContent.style.display = 'block';
    }
  }

  async injectContentScript(tabId) {
    try {
      console.log('Attempting to inject content script into tab', tabId);
      
      // Get tab info first
      const tab = await chrome.tabs.get(tabId);
      console.log('Tab URL:', tab.url, 'Status:', tab.status);
      
      // Make sure the tab is fully loaded
      if (tab.status !== 'complete') {
        console.log('Tab not fully loaded, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-simple.js']
      });
      
      console.log('Content script injected successfully into tab', tabId);
      
      // Wait a bit more for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Failed to inject content script:', error);
      throw new Error(`Content script injection failed: ${error.message}`);
    }
  }

  openNorthstar() {
    chrome.tabs.create({ url: this.northstarUrl });
  }

  async showDebugInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      let debugInfo = `<strong>Debug Information:</strong><br><br>`;
      debugInfo += `<strong>Tab ID:</strong> ${tab.id}<br>`;
      debugInfo += `<strong>URL:</strong> ${tab.url}<br>`;
      debugInfo += `<strong>Status:</strong> ${tab.status}<br>`;
      debugInfo += `<strong>Is D2L Page:</strong> ${this.isD2LPage(tab.url)}<br><br>`;
      
      // Try to ping content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        debugInfo += `<strong>Content Script:</strong> ✅ Active<br>`;
        debugInfo += `<strong>Response:</strong> ${JSON.stringify(response)}<br>`;
      } catch (error) {
        debugInfo += `<strong>Content Script:</strong> ❌ Not Active<br>`;
        debugInfo += `<strong>Error:</strong> ${error.message}<br>`;
      }
      
      debugInfo += `<br><strong>Extension Version:</strong> 1.0.0<br>`;
      debugInfo += `<strong>Manifest V3:</strong> ✅<br>`;
      
      this.showMessage(debugInfo, 'info');
    } catch (error) {
      this.showMessage(`Debug error: ${error.message}`, 'error');
    }
  }

  showHelp() {
    const helpText = `
      <strong>How to use Northstar D2L Sync:</strong><br><br>
      1. Navigate to your D2L homepage or course pages<br>
      2. Click "Extract D2L Data" to scan the page<br>
      3. Click "Sync to Northstar" to import the data<br><br>
      <strong>Best pages to extract from:</strong><br>
      • D2L Homepage/Dashboard<br>
      • Course content pages<br>
      • Assignment/Dropbox pages<br>
      • Quiz pages<br>
      • Discussion forums<br><br>
      Make sure you're logged into both D2L and Northstar.
    `;
    
    this.showMessage(helpText, 'info');
  }
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
  new NorthstarSync();
});
