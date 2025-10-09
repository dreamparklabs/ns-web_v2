import React, { useState, useEffect, useCallback } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface SessionInfo {
  _id: Id<"userSessions">;
  sessionId: string;
  lastActiveAt: number;
  loginAt: number;
  isActive: boolean;
  customLabel?: string;
  
  // Device information
  browserName?: string;
  browserVersion?: string;
  deviceType?: string;
  osName?: string;
  osVersion?: string;
  deviceVendor?: string;
  deviceModel?: string;
  
  // Location information
  ipAddress?: string;
  city?: string;
  country?: string;
  region?: string;
  timezone?: string;
  isp?: string;
  
  // Technical information
  screenResolution?: string;
  language?: string;
  platform?: string;
  userAgent?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalSessions: number;
  sessionsPerPage: number;
}

export default function ActiveDevices() {
  const { user, session, isLoaded } = useUser();
  const clerk = useClerk();
  
  // State management
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({});
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalSessions: 0,
    sessionsPerPage: 5,
  });
  
  // Filter state
  const [sortBy, setSortBy] = useState<'lastActive' | 'created'>('lastActive');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Convex queries and mutations
  const userSessions = useQuery(
    api.userSessions.getUserActiveSessions,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const updateDeviceLabel = useMutation(api.userSessions.updateDeviceLabel);
  const removeSession = useMutation(api.userSessions.removeSession);
  const bulkRemoveSessions = useMutation(api.userSessions.bulkRemoveSessions);
  const revokeClerkSession = useAction(api.userSessions.revokeClerkSession);

  // Update sessions when data changes
  useEffect(() => {
    if (userSessions) {
      setSessions(userSessions);
      setLoading(false);
    }
  }, [userSessions]);

  // Show loading state until Clerk is loaded
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading security settings...</span>
      </div>
    );
  }

  // Filter and sort sessions
  useEffect(() => {
    const filtered = [...sessions];
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'lastActive':
          comparison = a.lastActiveAt - b.lastActiveAt;
          break;
        case 'created':
          comparison = a.loginAt - b.loginAt;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    setFilteredSessions(filtered);
    
    // Update pagination
    setPagination(prev => ({
      ...prev,
      totalSessions: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.sessionsPerPage),
      currentPage: Math.min(prev.currentPage, Math.ceil(filtered.length / prev.sessionsPerPage) || 1),
    }));
  }, [sessions, sortBy, sortOrder, deviceLabels]);

  // Get paginated sessions
  const getPaginatedSessions = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.sessionsPerPage;
    const endIndex = startIndex + pagination.sessionsPerPage;
    return filteredSessions.slice(startIndex, endIndex);
  };

  // Handle session termination
  const handleTerminateSession = async (sessionId: string) => {
    try {
      setTerminatingSession(sessionId);
      setError(null);
      
      // Ensure Clerk is loaded
      if (!isLoaded) {
        console.warn('Clerk not loaded yet');
        setError('Please wait for the application to load completely, then try again.');
        return;
      }
      
      // Check if this is the current session (session might be null, which is ok)
      const isCurrentSession = session?.id === sessionId;
      
      // Show confirmation for current session
      if (isCurrentSession) {
        const confirmed = window.confirm(
          "This will sign you out of your current session and redirect you to the sign-in page. Are you sure you want to continue?"
        );
        if (!confirmed) {
          setTerminatingSession(null);
          return;
        }
      }
      
      // First, try to revoke the Clerk session using the correct API
      try {
        // Check if this is a different session (not current)
        if (sessionId !== session?.id) {
          // For remote sessions, try server-side revocation
          console.log('Attempting server-side Clerk session revocation:', sessionId);
          try {
            const revocationResult = await revokeClerkSession({ sessionId });
            if (revocationResult.success) {
              console.log('✅ Clerk session successfully revoked:', sessionId, revocationResult.message);
            } else {
              console.warn('⚠️ Clerk session revocation failed:', sessionId, revocationResult.error);
            }
          } catch (serverError) {
            console.warn('❌ Server-side session revocation failed:', serverError);
            // Continue with database cleanup even if server-side revocation fails
          }
        } else {
          // For current session, we'll use clerk.signOut() later
          console.log('Current session will be handled by clerk.signOut()');
        }
      } catch (clerkError) {
        console.warn('Error handling Clerk session:', clerkError);
        // Continue with database cleanup even if Clerk handling fails
      }
      
      // Then remove from our database
      await removeSession({
        sessionId,
        endReason: "manual_signout",
      });
      
      // If this was the current session, sign out the user completely
      if (isCurrentSession) {
        console.log('Signing out current user session');
        await clerk.signOut();
        // The signOut() will redirect to the sign-in page automatically
        return;
      }
      
      // Remove from local state (only if not current session)
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      setSelectedSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
      
    } catch (err) {
      console.error("Error terminating session:", err);
      setError("Failed to sign out from device. Please try again.");
    } finally {
      setTerminatingSession(null);
    }
  };

  // Handle bulk termination
  const handleBulkTerminate = async () => {
    if (selectedSessions.size === 0) return;
    
    try {
      setError(null);
      
      // Ensure Clerk is loaded
      if (!isLoaded) {
        console.warn('Clerk not loaded yet');
        setError('Please wait for the application to load completely, then try again.');
        return;
      }
      
      const sessionIds = Array.from(selectedSessions);
      
      // Check if current session is being terminated (session might be null, which is ok)
      const isCurrentSessionSelected = session?.id ? sessionIds.includes(session.id) : false;
      
      // Show confirmation for bulk termination with current session
      if (isCurrentSessionSelected) {
        const confirmed = window.confirm(
          `This will sign you out from ${sessionIds.length} device(s), including your current session. You will be redirected to the sign-in page. Are you sure you want to continue?`
        );
        if (!confirmed) {
          return;
        }
      } else {
        const confirmed = window.confirm(
          `Are you sure you want to sign out from ${sessionIds.length} selected device(s)?`
        );
        if (!confirmed) {
          return;
        }
      }
      
      // First, handle Clerk session revocation
      const clerkRevocationPromises = sessionIds.map(async (sessionId) => {
        try {
          if (sessionId !== session?.id) {
            // For remote sessions, try server-side revocation
            console.log('Attempting server-side Clerk session revocation:', sessionId);
            try {
              const revocationResult = await revokeClerkSession({ sessionId });
              if (revocationResult.success) {
                console.log('✅ Clerk session successfully revoked:', sessionId, revocationResult.message);
                return { sessionId, success: true, method: 'server_side_revocation', message: revocationResult.message };
              } else {
                console.warn('⚠️ Clerk session revocation failed:', sessionId, revocationResult.error);
                return { sessionId, success: false, error: revocationResult.error, method: 'server_side_failed' };
              }
            } catch (serverError) {
              console.warn('❌ Server-side session revocation failed:', sessionId, serverError);
              return { sessionId, success: false, error: serverError.message, method: 'server_side_failed' };
            }
          } else {
            // Current session will be handled by clerk.signOut() later
            console.log('Current session will be handled by clerk.signOut():', sessionId);
            return { sessionId, success: true, method: 'signOut' };
          }
        } catch (error) {
          console.warn('Error handling Clerk session:', sessionId, error);
          return { sessionId, success: false, error };
        }
      });
      
      await Promise.all(clerkRevocationPromises);
      
      // Then remove from our database
      await bulkRemoveSessions({
        sessionIds,
        endReason: "bulk_signout",
      });
      
      // If current session was terminated, sign out completely
      if (isCurrentSessionSelected) {
        console.log('Current session was terminated, signing out user');
        await clerk.signOut();
        // The signOut() will redirect to the sign-in page automatically
        return;
      }
      
      // Remove terminated sessions from local state (only if not current session)
      setSessions(prev => prev.filter(s => !sessionIds.includes(s.sessionId)));
      setSelectedSessions(new Set());
      
    } catch (err) {
      console.error("Error terminating sessions:", err);
      setError("Failed to terminate selected sessions. Please try again.");
    }
  };

  // Handle device labeling
  const handleSaveLabel = async (sessionId: string) => {
    try {
      await updateDeviceLabel({
        sessionId,
        customLabel: labelInput,
      });
      
      setDeviceLabels(prev => ({
        ...prev,
        [sessionId]: labelInput,
      }));
      
      setEditingLabel(null);
      setLabelInput("");
    } catch (err) {
      console.error("Error saving label:", err);
      setError("Failed to save device label. Please try again.");
    }
  };

  // Utility functions
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Parse user agent string to extract browser and device info
  const parseUserAgent = (userAgent?: string) => {
    if (!userAgent) return { browser: 'Unknown Browser', device: 'Unknown Device', version: '' };

    const ua = userAgent.toLowerCase();
    let browser = 'Unknown Browser';
    let version = '';
    let device = 'Desktop';

    // Detect mobile devices
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
      device = 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet';
    }

    // Detect browsers
    if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
      browser = 'Chrome';
      const match = ua.match(/chrome\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
      const match = ua.match(/firefox\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
      const match = ua.match(/version\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    } else if (ua.includes('edg')) {
      browser = 'Edge';
      const match = ua.match(/edg\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    } else if (ua.includes('opr') || ua.includes('opera')) {
      browser = 'Opera';
      const match = ua.match(/(?:opr|opera)\/(\d+\.\d+)/);
      version = match ? match[1] : '';
    }

    return { browser, device, version };
  };

  // Get enhanced session info
  const getSessionInfo = (session: SessionInfo) => {
    const userAgentInfo = parseUserAgent(session.userAgent);
    
    // Build comprehensive location string
    const locationParts = [];
    if (session.city) locationParts.push(session.city);
    if (session.region && session.region !== session.city) {
      locationParts.push(session.region);
    }
    if (session.country) locationParts.push(session.country);
    
    const location = locationParts.length > 0 ? locationParts.join(', ') : 'Unknown Location';
    
    // Build device description
    const deviceParts = [];
    if (session.deviceVendor) deviceParts.push(session.deviceVendor);
    if (session.deviceModel) deviceParts.push(session.deviceModel);
    const deviceDescription = deviceParts.length > 0 ? deviceParts.join(' ') : null;
    
    return {
      browserName: session.browserName || userAgentInfo.browser,
      browserVersion: session.browserVersion || userAgentInfo.version,
      deviceType: session.deviceType || userAgentInfo.device,
      ipAddress: session.ipAddress || 'Unknown IP',
      location,
      userAgent: session.userAgent || 'Unknown User Agent',
      
      // Enhanced information
      osName: session.osName,
      osVersion: session.osVersion,
      deviceDescription,
      timezone: session.timezone,
      isp: session.isp,
      screenResolution: session.screenResolution,
      platform: session.platform,
    };
  };

  const getDeviceIcon = (deviceType?: string) => {
    if (deviceType?.toLowerCase().includes('mobile')) {
      return (
        <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" />
        </svg>
      );
    }
    if (deviceType?.toLowerCase().includes('tablet')) {
      return (
        <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  };

  const isCurrentSession = (sessionId: string) => {
    return clerk.session?.id === sessionId;
  };

  if (!isLoaded) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="text-gray-500 mt-2">Loading active devices...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-lg mb-2">No User Data Available</div>
        <p className="text-gray-400">Please refresh the page or contact support if this issue persists.</p>
      </div>
    );
  }

  const paginatedSessions = getPaginatedSessions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Active Devices</h4>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
              Live
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage devices where you're currently signed in ({filteredSessions.length} sessions)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'lastActive' | 'created')}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="lastActive">Sort by Last Active</option>
            <option value="created">Sort by Created</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {selectedSessions.size > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedSessions.size} selected
            </span>
            <button
              onClick={handleBulkTerminate}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 active:scale-95 border border-transparent rounded-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out Selected ({selectedSessions.size})
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-500 mt-2">Loading active devices...</p>
        </div>
      ) : paginatedSessions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg mb-2">No Active Sessions</div>
          <p className="text-gray-400">
            {sessions.length === 0 
              ? "You don't have any active sessions on other devices."
              : "No sessions match your current filters."
            }
          </p>
        </div>
      ) : (
        <>
          {/* Sessions List */}
          <div className="space-y-4">
            {paginatedSessions.map((session) => (
              <div key={session._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedSessions.has(session.sessionId)}
                      onChange={(e) => {
                        const newSet = new Set(selectedSessions);
                        if (e.target.checked) {
                          newSet.add(session.sessionId);
                        } else {
                          newSet.delete(session.sessionId);
                        }
                        setSelectedSessions(newSet);
                      }}
                      disabled={isCurrentSession(session.sessionId)}
                      className="mt-1"
                    />
                    
                    {getDeviceIcon(getSessionInfo(session).deviceType)}
                    
                    <div className="flex-1">
                      {(() => {
                        const sessionInfo = getSessionInfo(session);
                        return (
                          <>
                            <div className="flex items-center space-x-2 mb-2">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                {session.customLabel || deviceLabels[session.sessionId] || 
                                 `${sessionInfo.browserName}${sessionInfo.browserVersion ? ` ${sessionInfo.browserVersion}` : ''}`}
                              </h5>
                            
                            {isCurrentSession(session.sessionId) && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Current Device
                              </span>
                            )}
                            
                            {editingLabel === session.sessionId ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={labelInput}
                                  onChange={(e) => setLabelInput(e.target.value)}
                                  placeholder="Device name"
                                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  onKeyPress={(e) => e.key === 'Enter' && handleSaveLabel(session.sessionId)}
                                />
                                <button
                                  onClick={() => handleSaveLabel(session.sessionId)}
                                  className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingLabel(null);
                                    setLabelInput("");
                                  }}
                                  className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingLabel(session.sessionId);
                                  setLabelInput(session.customLabel || deviceLabels[session.sessionId] || "");
                                }}
                                className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span className="font-medium">{sessionInfo.deviceType}</span>
                              {sessionInfo.deviceDescription && (
                                <span>({sessionInfo.deviceDescription})</span>
                              )}
                              <span>IP: {sessionInfo.ipAddress}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span>{sessionInfo.location}</span>
                              {sessionInfo.timezone && (
                                <span>• {sessionInfo.timezone}</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4">
                              <span>Browser: {sessionInfo.browserName} {sessionInfo.browserVersion}</span>
                              {sessionInfo.osName && (
                                <span>• OS: {sessionInfo.osName} {sessionInfo.osVersion}</span>
                              )}
                            </div>
                            {sessionInfo.isp && (
                              <div className="flex items-center space-x-4">
                                <span>ISP: {sessionInfo.isp}</span>
                                {sessionInfo.screenResolution && (
                                  <span>• Resolution: {sessionInfo.screenResolution}</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center space-x-4">
                              <span>Last active: {formatDate(session.lastActiveAt)}</span>
                              <span>Created: {formatDate(session.loginAt)}</span>
                            </div>
                          </div>
                        </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    {!isCurrentSession(session.sessionId) && (
                      <button
                        onClick={() => handleTerminateSession(session.sessionId)}
                        disabled={terminatingSession === session.sessionId}
                        className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 active:scale-95 border border-transparent rounded-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 disabled:hover:shadow-sm disabled:active:scale-100"
                      >
                        {terminatingSession === session.sessionId ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Signing out...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((pagination.currentPage - 1) * pagination.sessionsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.sessionsPerPage, pagination.totalSessions)} of {pagination.totalSessions} sessions
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagination(prev => ({ ...prev, currentPage: pageNum }))}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          pagination.currentPage === pageNum
                            ? 'text-purple-600 bg-purple-50 border border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800'
                            : 'text-gray-600 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Information Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              For your security, regularly review your active devices and sign out from any devices you don't recognize or no longer use.
              Real-time updates are enabled - new sessions and changes will appear automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
