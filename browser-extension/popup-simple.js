// Northstar D2L Sync Extension - Enhanced with Authentication
console.log('🌟 Northstar D2L Sync popup loaded');

class NorthstarPopup {
  constructor() {
    // UI Elements
    this.statusDiv = document.getElementById('status');
    this.resultDiv = document.getElementById('result');
    this.authSection = document.getElementById('auth-section');
    this.userInfo = document.getElementById('user-info');
    this.userDetails = document.getElementById('user-details');
    this.syncSection = document.getElementById('sync-section');
    this.syncInfo = document.getElementById('sync-info');
    
    // State
    this.currentUser = null;
    this.extractedData = null;
    this.authToken = null;
    this.northstarUrl = 'http://localhost:5173';
    
    // Event Listeners
    this.setupEventListeners();
    
    // Initialize
    this.initialize();
  }

  setupEventListeners() {
    // Auth buttons - with null checks
    const checkSessionBtn = document.getElementById('check-session-btn');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (checkSessionBtn) checkSessionBtn.addEventListener('click', () => this.checkSessionManually());
    if (loginBtn) loginBtn.addEventListener('click', () => this.handleLogin());
    if (signupBtn) signupBtn.addEventListener('click', () => this.handleSignup());
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());
    
    // Extraction buttons - with null checks
    const pingBtn = document.getElementById('ping-btn');
    const injectBtn = document.getElementById('inject-btn');
    const extractBtn = document.getElementById('extract-btn');
    const extractAllBtn = document.getElementById('extract-all-btn');
    const extractAllCoursesBtn = document.getElementById('extract-all-courses-btn');
    const syncBtn = document.getElementById('sync-btn');
    const debugBtn = document.getElementById('debug-btn');
    const passwordInput = document.getElementById('password-input');
    
    if (pingBtn) pingBtn.addEventListener('click', () => this.pingContentScript());
    if (injectBtn) injectBtn.addEventListener('click', () => this.forceInject());
    if (extractBtn) extractBtn.addEventListener('click', () => this.testExtract());
    if (extractAllBtn) extractAllBtn.addEventListener('click', () => this.extractAllData());
    if (extractAllCoursesBtn) extractAllCoursesBtn.addEventListener('click', () => this.extractAllCourses());
    if (syncBtn) syncBtn.addEventListener('click', () => this.syncToNorthstar());
    if (debugBtn) debugBtn.addEventListener('click', () => this.showDebug());
    
    // Auto-sync toggle
    const autoSyncToggle = document.getElementById('auto-sync-toggle');
    if (autoSyncToggle) {
      this.initializeAutoSyncToggle(autoSyncToggle);
      autoSyncToggle.addEventListener('change', (e) => this.toggleAutoSync(e.target.checked));
    }
    
    // Enter key support for auth form
    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleLogin();
      });
    }
  }

  async initialize() {
    console.log('🚀 Initializing Northstar extension...');
    this.setStatus('🔄 Initializing...', 'info');
    
    // Check if user is already logged in
    console.log('🔍 Checking authentication status...');
    await this.checkAuthStatus();
    
    // Check current tab
    console.log('🔍 Checking current tab...');
    await this.checkTab();
    
    console.log('✅ Initialization complete');
  }

  async checkAuthStatus() {
    try {
      console.log('🔍 Checking stored auth...');
      // Try to get stored auth token
      const result = await chrome.storage.local.get(['northstarAuth']);
      console.log('🔍 Stored auth result:', result);
      
      // Also check for auth data stored by background script
      const backgroundAuthData = await chrome.storage.local.get(['northstar_auth_data']);
      console.log('🔍 Background auth data:', backgroundAuthData);
      
      // Note: Extension popup can't directly access web page localStorage
      // Auth data should come through content script -> background script -> storage
      
      if (result) {
        console.log('🔍 Chrome storage auth details:', JSON.stringify(result, null, 2));
      }
      
      if (result.northstarAuth) {
        console.log('🔍 Found stored auth, verifying...');
        this.authToken = result.northstarAuth.token;
        this.currentUser = result.northstarAuth.user;
        
        // Check if this is minimal auth data that needs upgrading
        if (result.northstarAuth.isMinimal || this.currentUser.clerkUserId === 'authenticated_user' || this.currentUser.clerkUserId === 'session-detected') {
          console.log('🔄 Found minimal auth data, attempting to upgrade to real user data...');
          
          try {
            const realUserData = await this.fetchRealUserData();
            if (realUserData && realUserData.clerkUserId && realUserData.clerkUserId !== 'session-detected') {
              console.log('✅ Successfully upgraded to real user data:', realUserData);
              console.log('🔍 Real user clerkUserId:', realUserData.clerkUserId);
              console.log('🔍 Real user email:', realUserData.email);
              console.log('🔍 Real user firstName:', realUserData.firstName);
              
              // Update stored auth with real data
              const upgradedAuthData = {
                user: realUserData,
                token: null,
                timestamp: Date.now(),
                persistent: true,
                isMinimal: false
              };
              
              await chrome.storage.local.set({ 'northstarAuth': upgradedAuthData });
              this.currentUser = realUserData;
              this.showAuthenticatedState();
              return;
            } else {
              console.log('⚠️ Could not upgrade minimal auth - forcing re-authentication');
              console.log('🔄 Clearing stored auth to force fresh authentication');
              await chrome.storage.local.remove(['northstarAuth']);
              this.lastAuthClear = Date.now(); // Track when we cleared auth
              this.currentUser = null;
              this.authToken = null;
              this.showUnauthenticatedState();
              this.setStatus('🔐 Please re-authenticate to get real user data', 'warning');
              return;
            }
          } catch (error) {
            console.log('⚠️ Failed to upgrade minimal auth:', error);
          }
        }
        
        // Verify token is still valid
        const isValid = await this.verifyAuthToken();
        if (isValid) {
          console.log('✅ Stored auth is valid');
          this.showAuthenticatedState();
          return;
        } else {
          console.log('❌ Stored auth is invalid, clearing...');
          // Clear invalid token
          await chrome.storage.local.remove(['northstarAuth']);
        }
      } else if (backgroundAuthData.northstar_auth_data && backgroundAuthData.northstar_auth_data.user) {
        console.log('🔍 Found background auth data, using it...');
        
        // Use auth data from background script
        await chrome.storage.local.set({
          'northstarAuth': {
            user: backgroundAuthData.northstar_auth_data.user,
            token: null,
            timestamp: Date.now(),
            persistent: true
          }
        });
        
        this.currentUser = backgroundAuthData.northstar_auth_data.user;
        this.authToken = null;
        
        // Verify this auth is still valid
        const isValid = await this.verifyAuthToken();
        if (isValid) {
          console.log('✅ Background auth is valid');
          this.showAuthenticatedState();
          return;
        } else {
          console.log('❌ Background auth is invalid, clearing...');
          await chrome.storage.local.remove(['northstarAuth', 'northstar_auth_data']);
        }
      }
      
      console.log('🔍 Checking web session...');
      // Try to check if user is logged in via web session
      const webAuth = await this.checkWebAuth();
      if (webAuth) {
        console.log('✅ Found valid web session');
        this.currentUser = webAuth;
        this.showAuthenticatedState();
      } else {
        console.log('❌ No valid authentication found');
        this.showUnauthenticatedState();
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      this.showUnauthenticatedState();
    }
  }

  async verifyAuthToken() {
    // For session-based auth, just check if we can get user data
    try {
      const webAuth = await this.checkWebAuth();
      return webAuth !== null;
    } catch (error) {
      return false;
    }
  }

  async checkWebAuth() {
    try {
      console.log('🔍 Checking web auth via server-side session...');
      
      const response = await fetch(`${this.northstarUrl}/api/auth/realuser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('🔍 Auth check response:', response.status, response.statusText);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('🔍 User data received:', userData);
        console.log('🔍 User data details - authenticated:', userData.authenticated, 'requiresCallback:', userData.requiresCallback, 'clerkUserId:', userData.clerkUserId, 'email:', userData.email);
        
        if (userData.authenticated && !userData.requiresCallback) {
          return userData;
        } else if (userData.authenticated && userData.requiresCallback) {
          console.log('🔍 User is authenticated but needs callback flow for complete data');
          
          // Check if we recently completed a callback (within last 30 seconds)
          const recentCallbackData = await this.checkForRecentCallback();
          console.log('🔍 Recent callback data check result:', recentCallbackData);
          if (recentCallbackData) {
            console.log('🎉 Found recent callback completion, using that data');
            return recentCallbackData;
          }
          
          // Check if we just cleared auth data (to prevent infinite loop)
          const wasJustCleared = Date.now() - (this.lastAuthClear || 0) < 10000; // Within 10 seconds
          
          if (wasJustCleared) {
            console.log('🚫 Auth was just cleared - not creating minimal auth again');
            this.setStatus('🔐 Please click "Login to Northstar" to authenticate', 'warning');
            this.showResult('🔐 Authentication required. Please use the Login button to get your real user data.');
            return;
          }
          
          // UPDATED FALLBACK: Since the user is authenticated server-side, create a minimal auth object
          // This allows the extension to work without requiring the full callback flow every time
          console.log('🔄 Creating minimal auth data for authenticated user');
          const minimalAuthData = {
            authenticated: true,
            clerkUserId: 'authenticated_user', // Placeholder since we can't get real ID from cookies
            userId: 'authenticated_user',
            email: 'user@authenticated.local', // Placeholder email
            firstName: 'Authenticated',
            fullName: 'Authenticated User',
            requiresCallback: true // Flag that this is minimal data
          };
          
          // Store this minimal data for future use
          try {
            await chrome.storage.local.set({ 
              'northstarAuth': {
                user: minimalAuthData,
                token: null,
                timestamp: Date.now(),
                persistent: true,
                isMinimal: true // Flag to indicate this is minimal auth data
              }
            });
            console.log('✅ Stored minimal auth data for authenticated user');
          } catch (error) {
            console.log('⚠️ Could not store minimal auth data:', error);
          }
          
          return minimalAuthData;
        }
      } else {
        const errorData = await response.json();
        console.log('🔍 Auth check failed:', response.status, errorData);
      }
      
      return null;
    } catch (error) {
      console.error('🔍 Auth check error:', error);
      return null;
    }
  }

  async checkForRecentCallback() {
    try {
      // Check Chrome storage for recent auth data
      const result = await chrome.storage.local.get(['northstarAuth', 'northstar_auth_data']);
      
      // Check main auth storage
      if (result.northstarAuth && result.northstarAuth.user) {
        const timeDiff = Date.now() - result.northstarAuth.timestamp;
        if (timeDiff < 60000) { // Within last 60 seconds (increased from 30)
          console.log('🔍 Found recent Chrome storage auth data:', result.northstarAuth);
          return result.northstarAuth.user;
        }
      }

      // Check background auth data storage
      if (result.northstar_auth_data && result.northstar_auth_data.user) {
        const timeDiff = Date.now() - result.northstar_auth_data.timestamp;
        if (timeDiff < 60000) { // Within last 60 seconds
          console.log('🔍 Found recent background auth data:', result.northstar_auth_data);
          return result.northstar_auth_data.user;
        }
      }
      
      return null;
    } catch (error) {
      console.log('🔍 Error checking for recent callback:', error);
      return null;
    }
  }

  showAuthenticatedState() {
    this.authSection.style.display = 'none';
    this.userInfo.style.display = 'block';
    
    // Display name preference: fullName > firstName > email > clerkUserId
    const displayName = this.currentUser.fullName || 
                       this.currentUser.firstName || 
                       this.currentUser.email || 
                       this.currentUser.clerkUserId;
    
    const displayEmail = this.currentUser.email || '';
    
    // Check if this is minimal auth data
    const isMinimalAuth = this.currentUser.requiresCallback || this.currentUser.clerkUserId === 'authenticated_user';
    
    this.userDetails.innerHTML = `
      👤 <strong>${displayName}</strong><br>
      ${displayEmail && !displayEmail.includes('authenticated.local') ? `📧 ${displayEmail}<br>` : ''}
      🔐 ${isMinimalAuth ? 'Session detected' : 'Authenticated with Northstar'}
      ${isMinimalAuth ? '<br><small>💡 Full sync will get your real user details</small>' : ''}
    `;
    this.setStatus('✅ Ready to extract and sync D2L data', 'success');
  }

  showUnauthenticatedState() {
    this.authSection.style.display = 'block';
    this.userInfo.style.display = 'none';
    this.syncSection.style.display = 'none';
    this.setStatus('🔐 Please log in to Northstar to sync data', 'warning');
  }

  async checkSessionManually() {
    try {
      this.setStatus('🔄 Checking for existing session...', 'info');
      
      // First check stored auth in Chrome storage
      const result = await chrome.storage.local.get(['northstarAuth']);
      if (result.northstarAuth && result.northstarAuth.user) {
        // If this is minimal auth data, try to upgrade it first
        if (result.northstarAuth.isMinimal || result.northstarAuth.user.clerkUserId === 'authenticated_user') {
          console.log('🔄 Manual check found minimal auth, attempting upgrade...');
          const realUserData = await this.fetchRealUserData();
          
          if (realUserData && realUserData.clerkUserId) {
            console.log('✅ Successfully upgraded minimal auth during manual check');
            
            const upgradedAuthData = {
              user: realUserData,
              token: null,
              timestamp: Date.now(),
              persistent: true,
              isMinimal: false
            };
            
            await chrome.storage.local.set({ 'northstarAuth': upgradedAuthData });
            this.currentUser = realUserData;
            this.authToken = null;
            this.showAuthenticatedState();
            this.setStatus('✅ Found and upgraded session!', 'success');
            this.showResult('🎉 Successfully upgraded to real user authentication!\n\nYour session now has complete user details and you can extract and sync D2L assignments.');
            return;
          }
        }
        
        // Check if stored auth is still valid
        const isValid = await this.verifyStoredAuth(result.northstarAuth);
        if (isValid) {
          this.currentUser = result.northstarAuth.user;
          this.authToken = result.northstarAuth.token;
          this.showAuthenticatedState();
          this.setStatus('✅ Using stored session!', 'success');
          return;
        } else {
          // Clear invalid stored auth
          await chrome.storage.local.remove(['northstarAuth']);
        }
      }
      
      // Check background auth data that might not have been migrated
      const backgroundAuth = await chrome.storage.local.get(['northstar_auth_data']);
      if (backgroundAuth.northstar_auth_data && backgroundAuth.northstar_auth_data.user) {
        console.log('🔍 Manual check found background auth data:', backgroundAuth.northstar_auth_data);
        
        // Migrate to main auth storage and use it
        await chrome.storage.local.set({
          'northstarAuth': {
            user: backgroundAuth.northstar_auth_data.user,
            token: null,
            timestamp: Date.now(),
            persistent: true
          }
        });
        
        this.currentUser = backgroundAuth.northstar_auth_data.user;
        this.authToken = null;
        this.showAuthenticatedState();
        this.setStatus('✅ Found and migrated recent session!', 'success');
        this.showResult('🎉 Successfully found your authentication!\n\nYour session has been restored and you can now extract and sync D2L assignments.');
        return;
      }
      
      // Check web session
      const webAuth = await this.checkWebAuth();
      if (webAuth) {
        // Store the session for future use
        await chrome.storage.local.set({
          northstarAuth: {
            user: webAuth,
            token: null, // Using session-based auth
            timestamp: Date.now()
          }
        });
        
        this.currentUser = webAuth;
        this.showAuthenticatedState();
        this.setStatus('✅ Found existing session!', 'success');
        this.showResult('🎉 Successfully connected to your Northstar account!\n\nYou can now extract and sync D2L assignments.');
      } else {
        this.setStatus('❌ No active session found', 'error');
        this.showResult('❌ No active Northstar session found.\n\n' +
          'Click "🔑 Sign In" below to authenticate.');
      }
    } catch (error) {
      console.error('Session check failed:', error);
      this.setStatus('❌ Session check failed', 'error');
      this.showResult(`Session check failed: ${error.message}`);
    }
  }

  async verifyStoredAuth(authData) {
    // For persistent sessions, allow longer expiration (7 days)
    const maxAge = authData.persistent 
      ? 7 * 24 * 60 * 60 * 1000  // 7 days for persistent
      : 24 * 60 * 60 * 1000;     // 24 hours for regular

    if (Date.now() - authData.timestamp > maxAge) {
      return false;
    }

    // Verify with server
    try {
      const response = await fetch(`${this.northstarUrl}/api/auth/realuser`, {
        credentials: 'include'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async handleLogin() {
    try {
      this.setStatus('🔐 Opening authentication...', 'info');
      
      // Create a callback URL that the extension can listen for
      const callbackUrl = `${this.northstarUrl}/extension-auth-callback`;
      const authUrl = `${this.northstarUrl}/sign-in?extension_callback=true&callback_url=${encodeURIComponent(callbackUrl)}`;
      
      // Create a new tab for authentication
      const authTab = await chrome.tabs.create({ 
        url: authUrl,
        active: true
      });

      this.showResult('🔐 Authentication opened in new tab...\n\n' +
        '1. Complete sign-in in the new tab\n' +
        '2. The tab will close automatically\n' +
        '3. Return here to continue syncing\n\n' +
        '⏳ Waiting for authentication...');

      // Listen for the auth completion
      const authResult = await this.waitForAuthCallback(authTab.id);
      
      if (authResult.success) {
        this.currentUser = authResult.user;
        this.authToken = authResult.token;
        
        // Store auth info with longer expiration
        await chrome.storage.local.set({
          northstarAuth: {
            user: this.currentUser,
            token: this.authToken,
            timestamp: Date.now(),
            persistent: true // Mark as persistent session
          }
        });
        
        this.showAuthenticatedState();
        this.setStatus('✅ Successfully signed in!', 'success');
        this.showResult('🎉 Authentication successful!\n\nYou can now extract and sync D2L assignments.');
        
      } else {
        throw new Error(authResult.error || 'Authentication was cancelled or failed');
      }

    } catch (error) {
      console.error('Login failed:', error);
      this.setStatus('❌ Sign in failed: ' + error.message, 'error');
      this.showResult(`Authentication failed: ${error.message}\n\nPlease try again or check your internet connection.`);
    }
  }

  async waitForAuthCallback(authTabId) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Authentication timeout (2 minutes)' });
      }, 120000); // 2 minute timeout

      // Listen for messages from the auth window (Chrome extension messaging)
      const messageListener = (message, sender) => {
        console.log('🔍 Received message:', message);
        if (message.type === 'NORTHSTAR_AUTH_SUCCESS' && message.data) {
          console.log('🎉 Received auth success message:', message.data);
          
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          chrome.tabs.onRemoved.removeListener(tabRemovedListener);
          chrome.runtime.onMessage.removeListener(messageListener);

          // Close the auth tab
          chrome.tabs.remove(authTabId);
          
          resolve({
            success: true,
            user: message.data.user,
            token: null // Using session-based auth
          });
          return;
        }
        
        if (message.type === 'AUTH_COMPLETE' && message.data) {
          console.log('🎉 Received auth complete message:', message.data);
          
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          chrome.tabs.onRemoved.removeListener(tabRemovedListener);
          chrome.runtime.onMessage.removeListener(messageListener);

          // Close the auth tab
          chrome.tabs.remove(authTabId);
          
          resolve({
            success: true,
            user: message.data.user,
            token: null // Using session-based auth
          });
          return;
        }
      };

      // Listen for tab updates (URL changes) as fallback
      const tabUpdateListener = async (tabId, changeInfo) => {
        if (tabId === authTabId && changeInfo.url) {
          // Check if we've reached the callback URL
          if (changeInfo.url.includes('/extension-auth-callback')) {
            console.log('🔍 Reached callback URL:', changeInfo.url);
            
            // Check URL parameters immediately when we detect the callback URL
            console.log('🔍 Checking URL parameters immediately...');
            const url = new URL(changeInfo.url);
            console.log('🔍 Full callback URL:', changeInfo.url);
            
            if (url.searchParams.get('auth_success') === 'true') {
              const clerkUserId = url.searchParams.get('clerk_user_id');
              const email = url.searchParams.get('email');
              const firstName = url.searchParams.get('first_name');
              const fullName = url.searchParams.get('full_name');
              
              console.log('🔍 URL params found:', {
                auth_success: url.searchParams.get('auth_success'),
                clerk_user_id: clerkUserId,
                email: email,
                first_name: firstName,
                full_name: fullName
              });
              
              if (clerkUserId) {
                console.log('🎉 Found auth data in URL parameters');
                
                // Decode the URL-encoded values
                const decodedEmail = email ? decodeURIComponent(email) : '';
                const decodedFirstName = firstName ? decodeURIComponent(firstName) : '';
                const decodedFullName = fullName ? decodeURIComponent(fullName) : '';
                
                console.log('🔍 Decoded values:', {
                  email: decodedEmail,
                  firstName: decodedFirstName,
                  fullName: decodedFullName
                });
                
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                chrome.tabs.onRemoved.removeListener(tabRemovedListener);
                chrome.runtime.onMessage.removeListener(messageListener);

                // Don't close the tab immediately - let it close itself
                setTimeout(() => {
                  chrome.tabs.remove(authTabId);
                }, 1000);
                
                const userData = {
                  clerkUserId: clerkUserId,
                  userId: clerkUserId,
                  email: decodedEmail,
                  firstName: decodedFirstName,
                  fullName: decodedFullName,
                  authenticated: true
                };
                
                // Store the real user data
                await chrome.storage.local.set({
                  northstarAuth: {
                    user: userData,
                    token: null,
                    timestamp: Date.now()
                  }
                });
                console.log('🔐 Stored real user data in extension storage');
                
                resolve({
                  success: true,
                  user: userData,
                  token: null
                });
                return;
              }
            }
            
            // Wait a bit then check for auth data as fallback
            setTimeout(async () => {
              console.log('🔍 Fallback: Checking session via API...');
              
              // Try the real user endpoint first
              try {
                const realUserResponse = await fetch(`${this.northstarUrl}/api/auth/realuser`, {
                  method: 'GET',
                  credentials: 'include',
                  headers: {
                    'Accept': 'text/html,application/json',
                  }
                });
                
                if (realUserResponse.ok) {
                  const htmlText = await realUserResponse.text();
                  console.log('🔍 Real user response:', htmlText.substring(0, 500));
                  
                  // Try to extract JSON from the response
                  const jsonMatch = htmlText.match(/\{[\s\S]*"authenticated"[\s\S]*\}/);
                  if (jsonMatch) {
                    try {
                      const realUserData = JSON.parse(jsonMatch[0]);
                      console.log('🎉 Real user data found:', realUserData);
                      
                      if (realUserData.authenticated) {
                        clearTimeout(timeout);
                        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                        chrome.tabs.onRemoved.removeListener(tabRemovedListener);
                        chrome.runtime.onMessage.removeListener(messageListener);

                        // Close the auth tab
                        chrome.tabs.remove(authTabId);
                        
                        resolve({
                          success: true,
                          user: realUserData,
                          token: null
                        });
                        return;
                      }
                    } catch (parseError) {
                      console.log('🔍 Failed to parse real user data:', parseError);
                    }
                  }
                }
              } catch (error) {
                console.log('🔍 Real user endpoint failed:', error);
              }
              
              // Fallback to session check
              const sessionData = await this.checkWebAuth();
              if (sessionData && sessionData.authenticated) {
                console.log('🎉 Fallback auth check successful:', sessionData);
                
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                chrome.tabs.onRemoved.removeListener(tabRemovedListener);
                chrome.runtime.onMessage.removeListener(messageListener);

                // Close the auth tab
                chrome.tabs.remove(authTabId);
                
                resolve({
                  success: true,
                  user: sessionData,
                  token: null
                });
              }
            }, 2000); // Wait 2 seconds for session to be established
          }
        }
      };

      // Listen for tab being closed (user cancelled)
      const tabRemovedListener = (tabId) => {
        if (tabId === authTabId) {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          chrome.tabs.onRemoved.removeListener(tabRemovedListener);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve({ success: false, error: 'Authentication cancelled by user' });
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      chrome.tabs.onUpdated.addListener(tabUpdateListener);
      chrome.tabs.onRemoved.addListener(tabRemovedListener);
    });
  }

  async handleSignup() {
    // Open Northstar signup page and provide instructions
    chrome.tabs.create({ url: `${this.northstarUrl}/sign-up` });
    this.setStatus('📝 Opening signup page...', 'info');
    this.showResult('📝 Creating account in new tab...\n\n' +
      '1. Complete signup in the new tab\n' +
      '2. Sign in to Northstar\n' +
      '3. Return to this extension\n' +
      '4. The extension will detect your session automatically!');
  }

  async handleLogout() {
    try {
      // Clear stored auth
      await chrome.storage.local.remove(['northstarAuth']);
      
      // Clear web session
      await fetch(`${this.northstarUrl}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      this.currentUser = null;
      this.authToken = null;
      this.extractedData = null;
      
      this.showUnauthenticatedState();
      this.setStatus('👋 Signed out successfully', 'info');
      
    } catch (error) {
      console.error('Logout failed:', error);
      this.setStatus('⚠️ Logout completed (with errors)', 'warning');
    }
  }

  async waitForAuthCompletion(tabId) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Authentication timeout' });
      }, 60000); // 60 second timeout

      // Listen for messages from the auth tab
      const messageListener = (message, sender) => {
        if (sender.tab?.id === tabId && message.type === 'AUTH_COMPLETE') {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(message.data);
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
    });
  }
  
  async checkTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (this.isD2LPage(tab.url)) {
        this.setStatus(this.currentUser ? 
          '✅ D2L page detected - Ready to extract!' : 
          '🔐 D2L page detected - Please log in to sync', 
          this.currentUser ? 'success' : 'warning'
        );
      } else {
        this.setStatus('ℹ️ Navigate to a D2L page to extract data', 'info');
      }
    } catch (error) {
      this.setStatus('Error: ' + error.message, 'error');
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
  
  // D2L Extraction Methods (keeping existing functionality)
  async pingContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('🏓 Pinging content script on tab:', tab.id);
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      console.log('🏓 Ping response:', response);
      
      this.setStatus('✅ Content script is active!', 'success');
      this.showResult('Ping successful: ' + JSON.stringify(response, null, 2));
      
    } catch (error) {
      console.error('🏓 Ping failed:', error);
      this.setStatus('❌ Content script not responding', 'error');
      this.showResult('Ping failed: ' + error.message);
    }
  }
  
  async forceInject() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('💉 Force injecting content script into tab:', tab.id);
      
      this.setStatus('💉 Injecting content script...', 'info');
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-simple.js']
      });
      
      console.log('💉 Content script injected successfully');
      
      // Wait a moment for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to ping it
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        this.setStatus('✅ Content script injected and active!', 'success');
        this.showResult('Injection successful: ' + JSON.stringify(response, null, 2));
      } catch (pingError) {
        this.setStatus('⚠️ Injected but not responding', 'error');
        this.showResult('Injection completed but ping failed: ' + pingError.message);
      }
      
    } catch (error) {
      console.error('💉 Injection failed:', error);
      this.setStatus('❌ Injection failed', 'error');
      this.showResult('Injection failed: ' + error.message);
    }
  }
  
  async testExtract() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('🔍 Testing extract on tab:', tab.id);
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
      console.log('🔍 Extract response:', response);
      
      if (response && response.success) {
        this.setStatus('✅ Extract test successful!', 'success');
        this.showResult('Extract data: ' + JSON.stringify(response.data, null, 2));
      } else {
        this.setStatus('❌ Extract failed', 'error');
        this.showResult('Extract failed: ' + JSON.stringify(response, null, 2));
      }
      
    } catch (error) {
      console.error('🔍 Extract failed:', error);
      this.setStatus('❌ Extract error', 'error');
      this.showResult('Extract error: ' + error.message);
    }
  }
  
  async extractAllData() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('🚀 Starting comprehensive extraction on tab:', tab.id);
      
      this.setStatus('🚀 Extracting all data...', 'info');
      
      // First try to ping the content script to see if it's available
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        console.log('✅ Content script is available');
      } catch (pingError) {
        console.log('⚠️ Content script not available, attempting injection...');
        await this.forceInject();
        
        // Wait a bit for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractAllData' });
      console.log('🎉 Comprehensive extraction response:', response);
      console.log('🔍 Extracted assignments from content script:', response.assignments);
      console.log('🔍 Extracted courses from content script:', response.courses);
      
      if (response && response.success) {
        this.extractedData = response.data;
        this.setStatus('✅ All data extracted successfully!', 'success');
        
        // Show sync section if user is authenticated (even with 0 assignments for testing)
        if (this.currentUser) {
          this.syncSection.style.display = 'block';
          const assignmentCount = response.data.assignments?.length || 0;
          const courseCount = response.data.courses?.length || 0;
          const gradeCount = response.data.grades?.length || 0;
          
          if (assignmentCount > 0) {
            this.syncInfo.innerHTML = `
              📝 ${assignmentCount} assignments ready to sync<br>
              📚 ${courseCount} courses found<br>
              📊 ${gradeCount} grades found
            `;
          } else {
            this.syncInfo.innerHTML = `
              ⚠️ ${assignmentCount} assignments found<br>
              📚 ${courseCount} courses found<br>
              💡 Navigate to assignments page for better extraction
            `;
          }
        }
        
        // Show comprehensive results
        const data = response.data;
        const summary = `🎉 COMPREHENSIVE EXTRACTION COMPLETE!\n\n` +
                       `📚 Courses: ${data.courses?.length || 0}\n` +
                       `📝 Assignments: ${data.assignments?.length || 0}\n` +
                       `📊 Grades: ${data.grades?.length || 0}\n` +
                       `💬 Discussions: ${data.discussions?.length || 0}\n` +
                       `📢 Announcements: ${data.announcements?.length || 0}\n\n` +
                       `📋 EXTRACTION LOG:\n` +
                       `${data.extractionLog?.join('\n') || 'No log available'}\n\n` +
                       `📊 SAMPLE DATA (first 300 chars):\n` +
                       `${JSON.stringify(data, null, 2).substring(0, 300)}...`;
        
        this.showResult(summary);
      } else {
        this.setStatus('❌ Comprehensive extraction failed', 'error');
        this.showResult('Extraction failed: ' + (response ? response.error : 'No response'));
      }
      
    } catch (error) {
      console.error('❌ Comprehensive extraction error:', error);
      this.setStatus('❌ Extraction failed', 'error');
      this.showResult('Extraction error: ' + error.message);
    }
  }

  async extractAllCourses() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('🌟 Starting multi-course extraction on tab:', tab.id);
      
      this.setStatus('🌟 Extracting from ALL courses...', 'info');
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractAllCourses' });
      console.log('🎉 Multi-course extraction response:', response);
      
      if (response && response.success) {
        this.extractedData = response.data;
        this.setStatus('✅ All courses extracted successfully!', 'success');
        
        // Show sync section if user is authenticated (even with 0 assignments for testing)
        if (this.currentUser) {
          this.syncSection.style.display = 'block';
          const assignmentCount = response.data.assignments?.length || 0;
          const courseCount = response.data.courses?.length || 0;
          const gradeCount = response.data.grades?.length || 0;
          
          if (assignmentCount > 0) {
            this.syncInfo.innerHTML = `
              📝 ${assignmentCount} assignments ready to sync<br>
              📚 ${courseCount} courses found<br>
              📊 ${gradeCount} grades found
            `;
          } else {
            this.syncInfo.innerHTML = `
              ⚠️ ${assignmentCount} assignments found<br>
              📚 ${courseCount} courses found<br>
              💡 Navigate to assignments page for better extraction
            `;
          }
        }
        
        // Show comprehensive results (keeping existing display logic)
        const data = response.data;
        const courseResults = data.courseResults || [];
        const successfulCourses = courseResults.filter(r => r.status === 'success').length;
        const failedCourses = courseResults.filter(r => r.status === 'failed').length;
        const restrictedCourses = courseResults.filter(r => r.status === 'restricted').length;
        
        const summary = `🎉 SMART MULTI-COURSE EXTRACTION COMPLETE!\n\n` +
                       `📚 Total Courses Found: ${data.courses?.length || 0}\n` +
                       `✅ Successfully Extracted: ${successfulCourses}\n` +
                       `🔒 Access Restricted: ${restrictedCourses}\n` +
                       `❌ Failed: ${failedCourses}\n\n` +
                       `📊 EXTRACTED DATA:\n` +
                       `📝 Total Assignments: ${data.assignments?.length || 0}\n` +
                       `📊 Total Grades: ${data.grades?.length || 0}\n` +
                       `💬 Total Discussions: ${data.discussions?.length || 0}\n` +
                       `📢 Total Announcements: ${data.announcements?.length || 0}\n\n` +
                       `📋 EXTRACTION LOG:\n` +
                       `${data.extractionLog?.join('\n') || 'No log available'}`;
        
        this.showResult(summary);
      } else {
        this.setStatus('❌ Multi-course extraction failed', 'error');
        this.showResult('Multi-course extraction failed: ' + (response ? response.error : 'No response'));
      }
      
    } catch (error) {
      console.error('❌ Multi-course extraction error:', error);
      this.setStatus('❌ Multi-course extraction failed', 'error');
      this.showResult('Multi-course extraction error: ' + error.message);
    }
  }

  async syncToNorthstar() {
    if (!this.currentUser) {
      this.setStatus('❌ Please log in first', 'error');
      return;
    }

    if (!this.extractedData || !this.extractedData.assignments || this.extractedData.assignments.length === 0) {
      this.setStatus('❌ No assignments to sync. Extract data first.', 'error');
      return;
    }

    try {
      this.setStatus('📤 Syncing to Northstar...', 'info');
      
      let clerkUserId = this.currentUser.clerkUserId || this.currentUser.userId;
      
      // If we have minimal auth data, try to get the real user ID from the server
      if (clerkUserId === 'authenticated_user' || this.currentUser.requiresCallback) {
        console.log('🔍 Minimal auth detected, fetching real user ID from server...');
        try {
          const realUserResponse = await fetch(`${this.northstarUrl}/api/auth/user`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          });
          
          if (realUserResponse.ok) {
            const realUserData = await realUserResponse.json();
            console.log('🔍 Real user data from server:', realUserData);
            
            if (realUserData.clerkUserId) {
              clerkUserId = realUserData.clerkUserId;
              console.log('✅ Got real Clerk user ID:', clerkUserId);
              
              // Update stored auth data with real user info
              const updatedAuthData = {
                ...this.currentUser,
                clerkUserId: realUserData.clerkUserId,
                userId: realUserData.clerkUserId,
                email: realUserData.email || this.currentUser.email,
                firstName: realUserData.firstName || this.currentUser.firstName,
                fullName: realUserData.fullName || this.currentUser.fullName,
                requiresCallback: false // No longer needs callback
              };
              
              this.currentUser = updatedAuthData;
              
              await chrome.storage.local.set({
                'northstarAuth': {
                  user: updatedAuthData,
                  token: null,
                  timestamp: Date.now(),
                  persistent: true,
                  isMinimal: false
                }
              });
              
              console.log('✅ Updated auth data with real user info');
            }
          }
        } catch (error) {
          console.log('⚠️ Could not fetch real user data, using minimal auth:', error);
        }
      }
      
      // Clean assignment data with AI first
      console.log('🤖 Cleaning assignment data with AI...');
      console.log('🔍 Raw assignment data before AI cleaning:', this.extractedData.assignments);
      const rawAssignmentData = this.extractedData.assignments.map(assignment => ({
        id: assignment.id || `assignment_${Date.now()}_${Math.random()}`,
        name: assignment.name,
        dueDate: assignment.dueDate,
        type: assignment.type,
        courseOrgUnitId: assignment.courseOrgUnitId,
        maxPoints: assignment.maxPoints,
        pointsEarned: assignment.pointsEarned,
      }));

      let cleanedAssignments;
      try {
        const cleaningResponse = await fetch(`${this.northstarUrl}/api/convex`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
          },
          credentials: 'include',
          body: JSON.stringify({
            function: 'aiParser:cleanAssignmentDataWithAI',
            args: {
              clerkUserId: clerkUserId,
              rawAssignmentData: rawAssignmentData
            }
          })
        });

        if (cleaningResponse.ok) {
          const cleaningResult = await cleaningResponse.json();
          cleanedAssignments = cleaningResult.cleanedAssignments;
          console.log('✅ AI cleaning successful:', cleaningResult);
          console.log('🔍 Cleaned assignment data after AI:', cleanedAssignments);
        } else {
          console.warn('⚠️ AI cleaning failed, using original data');
          cleanedAssignments = rawAssignmentData;
        }
      } catch (error) {
        console.warn('⚠️ AI cleaning error, using original data:', error);
        cleanedAssignments = rawAssignmentData;
      }

      // Prepare assignment data with course information
      const assignmentsWithCourseInfo = cleanedAssignments.map(assignment => {
        const correspondingCourse = (this.extractedData.courses || []).find(course => 
          course.orgUnitId === assignment.courseOrgUnitId
        );

        return {
          id: assignment.id,
          name: assignment.name,
          description: assignment.description || undefined,
          dueDate: assignment.dueDate || undefined,
          type: assignment.type || 'assignment',
          courseOrgUnitId: assignment.courseOrgUnitId || undefined,
          courseName: correspondingCourse?.name || assignment.courseName || `Course ${assignment.courseOrgUnitId}`,
          courseCode: correspondingCourse?.code || assignment.courseCode || '',
          submissionStatus: assignment.submissionStatus || 'not_submitted',
          maxPoints: assignment.maxPoints || undefined,
          pointsEarned: assignment.pointsEarned || undefined,
        };
      });

      console.log('🔄 Syncing assignments:', assignmentsWithCourseInfo);

      // Sync courses first if we have them
      if (this.extractedData.courses && this.extractedData.courses.length > 0) {
        await this.syncCourses(clerkUserId);
      }

      // Sync announcements and extract rules if we have them
      if (this.extractedData.announcements && this.extractedData.announcements.length > 0) {
        await this.syncAnnouncements(clerkUserId);
      }

      // Sync assignments
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(`${this.northstarUrl}/api/convex`, {
        method: 'POST',
        headers,
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
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Sync result:', result);

      if (result.success) {
        const { 
          totalSynced, 
          totalProcessed, 
          totalCreated, 
          totalUpdated, 
          totalUnchanged, 
          matchingResults, 
          updateSummary 
        } = result;
        
        const matchedCount = matchingResults.filter(r => r.matched).length;
        
        this.setStatus('✅ Sync completed successfully!', 'success');
        
        // Build detailed result message
        let resultMessage = `✅ Successfully processed ${totalProcessed} assignments!\n\n`;
        
        if (totalCreated > 0) {
          resultMessage += `🆕 ${totalCreated} new assignments added\n`;
        }
        if (totalUpdated > 0) {
          resultMessage += `🔄 ${totalUpdated} assignments updated (grades, names, status)\n`;
        }
        if (totalUnchanged > 0) {
          resultMessage += `📋 ${totalUnchanged} assignments unchanged\n`;
        }
        
        resultMessage += `\n📍 ${matchedCount} assignments matched to courses.\n`;
        resultMessage += `🎉 Your D2L assignments are now in Northstar!`;
        
        // Show update details if available
        if (result.syncedAssignments) {
          const updatedAssignments = result.syncedAssignments.filter(a => a.action === 'updated');
          if (updatedAssignments.length > 0) {
            resultMessage += `\n\n📝 Updated assignments:\n`;
            updatedAssignments.slice(0, 3).forEach(assignment => {
              if (assignment.changes && assignment.changes.length > 0) {
                resultMessage += `• ${assignment.title}: ${assignment.changes.join(', ')}\n`;
              }
            });
            if (updatedAssignments.length > 3) {
              resultMessage += `• ... and ${updatedAssignments.length - 3} more\n`;
            }
          }
        }
        
        this.showResult(resultMessage);
        
        // Hide sync section after successful sync
        this.syncSection.style.display = 'none';
        
      } else {
        throw new Error('Sync operation failed');
      }

    } catch (error) {
      console.error('❌ Sync error:', error);
      this.setStatus('❌ Sync failed', 'error');
      this.showResult(`Sync failed: ${error.message}\n\nPlease try logging out and back in.`);
    }
  }

  // Fetch user data from Northstar API
  async fetchUserData() {
    try {
      const response = await fetch(`${this.northstarUrl}/api/auth/realuser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        return userData;
      } else {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      throw error;
    }
  }

  // Fetch real user data with actual Clerk user ID
  async fetchRealUserData() {
    console.log('🔍 Attempting to fetch real user data from server...');
    
    try {
      // Try the /api/auth/user endpoint which should have real user data
      const userResponse = await fetch(`${this.northstarUrl}/api/auth/user`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('🔍 User endpoint response:', userResponse.status);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('🔍 Real user data from /api/auth/user:', userData);
        
        if (userData.clerkUserId) {
          return {
            authenticated: true,
            clerkUserId: userData.clerkUserId,
            userId: userData.clerkUserId,
            email: userData.email || '',
            firstName: userData.firstName || '',
            fullName: userData.fullName || userData.firstName || userData.email,
            requiresCallback: false
          };
        }
      }
      
      // Fallback: Try to extract real data from session endpoint
      const sessionResponse = await fetch(`${this.northstarUrl}/api/auth/session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('🔍 Session endpoint response:', sessionResponse.status);
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        console.log('🔍 Session data:', sessionData);
        
        if (sessionData.user && sessionData.user.id) {
          return {
            authenticated: true,
            clerkUserId: sessionData.user.id,
            userId: sessionData.user.id,
            email: sessionData.user.primaryEmailAddress?.emailAddress || '',
            firstName: sessionData.user.firstName || '',
            fullName: sessionData.user.fullName || sessionData.user.firstName || sessionData.user.primaryEmailAddress?.emailAddress,
            requiresCallback: false
          };
        }
      }
      
      console.log('⚠️ Could not fetch real user data from any endpoint');
      return null;
      
    } catch (error) {
      console.error('❌ Error fetching real user data:', error);
      return null;
    }
  }

  // Get active term based on current date
  async getActiveTermByDate(clerkUserId) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      console.log('🔍 Calling getActiveTermByDate with clerkUserId:', clerkUserId);
      const requestBody = {
        function: 'terms:getActiveTermByDate',
        args: {
          clerkUserId: clerkUserId
        }
      };
      console.log('🔍 Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.northstarUrl}/api/convex`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 getActiveTermByDate response:', result);
        return result;
      } else {
        const errorText = await response.text();
        console.error('❌ getActiveTermByDate error response:', response.status, errorText);
        throw new Error(`Failed to get active term: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error getting active term:', error);
      throw error;
    }
  }

  // Update user's current active term
  async updateUserActiveTerm(clerkUserId, termId) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(`${this.northstarUrl}/api/convex`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          function: 'terms:updateUserActiveTerm',
          args: {
            clerkUserId: clerkUserId,
            termId: termId
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        throw new Error(`Failed to update user active term: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error updating user active term:', error);
      throw error;
    }
  }

  async syncCourses(clerkUserId) {
    console.log('📚 Syncing courses to Northstar...');
    
    const coursesData = this.extractedData.courses.map(course => ({
      orgUnitId: course.orgUnitId,
      name: course.name,
      code: course.code || course.name.split(' ')[0],
      instructor: course.instructor || 'TBD',
      isActive: course.isActive !== false
    }));

    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Get current active term based on date ranges
    console.log('🔍 Getting active term for user ID:', clerkUserId);
    const activeTerm = await this.getActiveTermByDate(clerkUserId);
    
    if (!activeTerm) {
      throw new Error('No active term found. Please create a term that includes the current date in Northstar.');
    }

    console.log(`Using active term: ${activeTerm.name} (${activeTerm._id})`);

    // Update user's currentActiveTerm in the database to match the date-based active term
    try {
      await this.updateUserActiveTerm(clerkUserId, activeTerm._id);
      console.log(`✅ Updated user's currentActiveTerm to ${activeTerm._id}`);
    } catch (error) {
      console.warn(`⚠️ Failed to update user's currentActiveTerm:`, error);
      // Continue with sync even if this fails
    }

    // Process each course individually to avoid duplicates
    for (const courseData of coursesData) {
      try {
        console.log(`🔍 Processing course: ${courseData.name}`);
        const response = await fetch(`${this.northstarUrl}/api/convex`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            function: 'aiParser:findAndMergeSimilarCourse',
            args: {
              clerkUserId: clerkUserId,
              d2lCourseData: {
                name: courseData.name,
                code: courseData.code,
                instructor: courseData.instructor,
                orgUnitId: courseData.orgUnitId
              },
              termId: activeTerm._id
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Course processed: ${courseData.name} - ${result.action} (${result.courseId})`);
        } else {
          console.warn(`⚠️ Failed to process course: ${courseData.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing course ${courseData.name}:`, error);
      }
    }

    console.log('✅ All courses processed with smart matching');
  }

  async syncAnnouncements(clerkUserId) {
    console.log('📢 Processing announcements for assignment rules...');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Prepare announcement data with course information
    const announcementsWithCourseInfo = this.extractedData.announcements.map(announcement => {
      const correspondingCourse = (this.extractedData.courses || []).find(course => 
        course.orgUnitId === announcement.courseOrgUnitId
      );

      return {
        id: announcement.id || `announcement_${Date.now()}_${Math.random()}`,
        title: announcement.title || 'Untitled Announcement',
        content: announcement.content || announcement.body || '',
        publishedDate: announcement.publishedDate || announcement.date,
        courseOrgUnitId: announcement.courseOrgUnitId,
        courseName: correspondingCourse?.name || announcement.courseName || `Course ${announcement.courseOrgUnitId}`,
      };
    });

    const response = await fetch(`${this.northstarUrl}/api/convex`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        function: 'd2lScraper:processScrapedAnnouncements',
        args: {
          clerkUserId: clerkUserId,
          announcementsData: announcementsWithCourseInfo
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('📢 Announcement processing result:', result);
      
      if (result.totalRulesExtracted > 0) {
        console.log(`🎯 Extracted ${result.totalRulesExtracted} assignment rules from announcements!`);
      }
      
      return result;
    } else {
      console.warn(`⚠️ Announcement processing failed: ${response.statusText}`);
      return null; // Don't fail the entire sync if announcements fail
    }
  }

  async showDebug() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const debug = {
        tabId: tab.id,
        url: tab.url,
        status: tab.status,
        isD2L: this.isD2LPage(tab.url),
        authenticated: !!this.currentUser,
        hasExtractedData: !!this.extractedData,
        extractedAssignments: this.extractedData?.assignments?.length || 0,
        timestamp: new Date().toISOString()
      };
      
      this.showResult('Debug Info: ' + JSON.stringify(debug, null, 2));
      
    } catch (error) {
      this.showResult('Debug error: ' + error.message);
    }
  }
  
  setStatus(message, type) {
    this.statusDiv.textContent = message;
    this.statusDiv.className = 'status ' + type;
  }
  
  showResult(text) {
    this.resultDiv.textContent = text;
    this.resultDiv.style.display = 'block';
  }

  // Initialize auto-sync toggle state
  async initializeAutoSyncToggle(toggleElement) {
    try {
      const settings = await chrome.storage.local.get(['autoSyncEnabled']);
      toggleElement.checked = settings.autoSyncEnabled || false;
      console.log('🔄 Auto-sync setting loaded:', settings.autoSyncEnabled);
    } catch (error) {
      console.error('❌ Failed to load auto-sync setting:', error);
    }
  }

  // Toggle auto-sync setting
  async toggleAutoSync(enabled) {
    try {
      await chrome.storage.local.set({ autoSyncEnabled: enabled });
      console.log(`🔄 Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
      
      this.showResult(
        `Auto-sync ${enabled ? 'enabled' : 'disabled'}!\n\n` +
        (enabled 
          ? '✅ Northstar will now automatically sync your D2L data when you log into D2L'
          : '⏸️ Auto-sync is disabled. You can still sync manually using the extension'
        )
      );
      
      // Show immediate status
      this.setStatus(
        enabled ? '🔄 Auto-sync enabled' : '⏸️ Auto-sync disabled', 
        enabled ? 'success' : 'info'
      );
      
    } catch (error) {
      console.error('❌ Failed to toggle auto-sync:', error);
      this.setStatus('❌ Failed to update auto-sync setting', 'error');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new NorthstarPopup();
});