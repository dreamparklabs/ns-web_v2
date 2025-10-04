// Northstar D2L Sync Background Script

console.log('Northstar D2L Sync: Background script starting...');

// Simple message listener for data extraction events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.action === 'dataExtracted') {
    console.log('Data extracted from:', sender.tab.url, message.data);
    
    // Store the extracted data
    chrome.storage.local.set({
      [`d2l_data_${sender.tab.id}`]: {
        data: message.data,
        url: sender.tab.url,
        timestamp: Date.now()
      }
    });
    
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
  
  if (message.type === 'AUTH_COMPLETE') {
    console.log('Auth completion received in background:', message.data);
    
    // Store auth completion data
    chrome.storage.local.set({
      'northstar_auth_complete': {
        ...message.data,
        timestamp: Date.now()
      }
    });
    
    sendResponse({ success: true });
    return false; // Synchronous response
  }
  
  // Default response for unknown messages
  sendResponse({ success: false, error: 'Unknown message type' });
  return false; // Synchronous response
});

// Simple function to check if a URL is a D2L page
function isD2LPage(url) {
  return url && (
    url.includes('brightspace.com') || 
    url.includes('.siu.edu') ||
    url.includes('/d2l/') ||
    (url.includes('.edu') && url.includes('mycourses'))
  );
}

console.log('Northstar D2L Sync: Background script initialized');
