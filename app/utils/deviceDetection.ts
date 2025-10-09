// Device detection utility for session tracking

export interface DeviceInfo {
  browserName?: string;
  browserVersion?: string;
  deviceType?: string;
  osName?: string;
  osVersion?: string;
  deviceVendor?: string;
  deviceModel?: string;
  ipAddress?: string;
  city?: string;
  country?: string;
  region?: string;
  timezone?: string;
  isp?: string;
  screenResolution?: string;
  language?: string;
  platform?: string;
  userAgent?: string;
}

export function detectDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {};
  }

  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const platform = navigator.platform;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Screen resolution
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  
  // Browser detection
  let browserName = 'Unknown';
  let browserVersion = '';
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('OPR')) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    browserName = 'Opera';
    const match = userAgent.match(/(?:OPR|Opera)\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : '';
  }
  
  // Device type detection
  let deviceType = 'Desktop';
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    deviceType = 'Mobile';
  } else if (/iPad|Android(?=.*\bMobile\b)/i.test(userAgent)) {
    deviceType = 'Tablet';
  }
  
  // OS detection
  let osName = 'Unknown';
  let osVersion = '';
  
  if (userAgent.includes('Windows')) {
    osName = 'Windows';
    if (userAgent.includes('Windows NT 10.0')) {
      osVersion = '10';
    } else if (userAgent.includes('Windows NT 6.3')) {
      osVersion = '8.1';
    } else if (userAgent.includes('Windows NT 6.2')) {
      osVersion = '8';
    } else if (userAgent.includes('Windows NT 6.1')) {
      osVersion = '7';
    }
  } else if (userAgent.includes('Mac OS X')) {
    osName = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (userAgent.includes('Linux')) {
    osName = 'Linux';
  } else if (userAgent.includes('Android')) {
    osName = 'Android';
    const match = userAgent.match(/Android (\d+\.\d+)/);
    osVersion = match ? match[1] : '';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    osName = 'iOS';
    const match = userAgent.match(/OS (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : '';
  }
  
  // Device vendor/model detection (basic)
  let deviceVendor = '';
  let deviceModel = '';
  
  if (userAgent.includes('iPhone')) {
    deviceVendor = 'Apple';
    deviceModel = 'iPhone';
  } else if (userAgent.includes('iPad')) {
    deviceVendor = 'Apple';
    deviceModel = 'iPad';
  } else if (userAgent.includes('Mac')) {
    deviceVendor = 'Apple';
    deviceModel = 'Mac';
  } else if (userAgent.includes('Android')) {
    deviceVendor = 'Various';
    deviceModel = 'Android Device';
  } else if (userAgent.includes('Windows')) {
    deviceVendor = 'Various';
    deviceModel = 'PC';
  }
  
  return {
    browserName,
    browserVersion,
    deviceType,
    osName,
    osVersion,
    deviceVendor,
    deviceModel,
    language,
    platform,
    timezone,
    screenResolution,
    userAgent,
  };
}

// Function to get IP address and location (requires external service)
export async function getLocationInfo(): Promise<{ ipAddress?: string; city?: string; country?: string; region?: string; isp?: string }> {
  try {
    // Using a free IP geolocation service
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      return {
        ipAddress: data.ip,
        city: data.city,
        country: data.country_name,
        region: data.region,
        isp: data.org,
      };
    }
  } catch (error) {
    console.warn('Failed to fetch location info:', error);
  }
  
  return {};
}
