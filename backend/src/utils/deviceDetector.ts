// ============================================================
// src/utils/deviceDetector.ts
// Device, Browser, OS, and Approximate Location Detection
// ============================================================

import { Request } from 'express';
import crypto from 'crypto';

export interface ClientDeviceInfo {
  deviceId: string;
  device: string;          // Desktop, Mobile, Tablet
  browser: string;         // Chrome, Firefox, Safari, Edge, etc.
  operatingSystem: string; // Windows, macOS, Linux, Android, iOS, etc.
  userAgent: string;
  ipAddress: string;
  city: string;
  state: string;
  country: string;
}

/**
 * Detect browser name from user-agent string.
 */
function parseBrowser(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'Unknown Browser';
}

/**
 * Detect operating system from user-agent string.
 */
function parseOperatingSystem(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown OS';
}

/**
 * Detect device category from user-agent string.
 */
function parseDeviceType(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  if (/mobile|android|iphone/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

/**
 * Extract client IP address from standard request headers.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * Parse client device, browser, OS, and location from incoming request.
 */
export function extractClientDeviceInfo(req: Request): ClientDeviceInfo {
  const userAgent = (req.headers['user-agent'] as string) || 'Unknown User-Agent';
  const ipAddress = getClientIp(req);

  const browser = parseBrowser(userAgent);
  const operatingSystem = parseOperatingSystem(userAgent);
  const device = parseDeviceType(userAgent);

  // Approximate location from CDN/proxy headers or fallback
  const city = (req.headers['x-client-city'] as string) ||
    (req.headers['cf-ipcity'] as string) ||
    (req.headers['x-vercel-ip-city'] as string) ||
    'Unknown';

  const state = (req.headers['x-client-state'] as string) ||
    (req.headers['cf-region'] as string) ||
    (req.headers['x-vercel-ip-country-region'] as string) ||
    'Unknown';

  const country = (req.headers['x-client-country'] as string) ||
    (req.headers['cf-ipcountry'] as string) ||
    (req.headers['x-vercel-ip-country'] as string) ||
    'Unknown';

  // Deterministic device fingerprint
  const customDeviceId = req.headers['x-device-id'] as string | undefined;
  const rawFingerprint = customDeviceId || `${device}-${browser}-${operatingSystem}-${userAgent}`;
  const deviceId = crypto.createHash('sha256').update(rawFingerprint).digest('hex').slice(0, 32);

  return {
    deviceId,
    device,
    browser,
    operatingSystem,
    userAgent,
    ipAddress,
    city,
    state,
    country,
  };
}

/**
 * Compare current client information against user's previous verified login history.
 * If user has previous logins, determine if device or location is unfamiliar.
 */
export function evaluateLoginContext(
  current: ClientDeviceInfo,
  previousLogins: Array<{
    deviceId: string;
    device?: string | null;
    browser?: string | null;
    operatingSystem?: string | null;
    city?: string | null;
    cityRegion?: string | null;
    state?: string | null;
    verified: boolean;
    successful: boolean;
  }>
): {
  isNewDevice: boolean;
  isNewLocation: boolean;
  requiresOtp: boolean;
  reason?: 'NEW_DEVICE' | 'NEW_LOCATION';
} {
  // If no prior verified logins, this is the first login session (requires verification if newly registered)
  const verifiedLogins = previousLogins.filter((l) => l.verified && l.successful);
  if (verifiedLogins.length === 0) {
    return {
      isNewDevice: true,
      isNewLocation: true,
      requiresOtp: true,
      reason: 'NEW_DEVICE',
    };
  }

  // Check if device matches any previous verified login
  const knownDevice = verifiedLogins.some((login) => {
    if (login.deviceId === current.deviceId) return true;
    if (
      login.browser &&
      login.operatingSystem &&
      login.browser.toLowerCase() === current.browser.toLowerCase() &&
      login.operatingSystem.toLowerCase() === current.operatingSystem.toLowerCase() &&
      login.device?.toLowerCase() === current.device.toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  // Check location (city / state) if not Unknown
  let isNewLocation = false;
  if (current.state !== 'Unknown' || current.city !== 'Unknown') {
    const knownLocation = verifiedLogins.some((login) => {
      const stateMatch =
        login.state && current.state !== 'Unknown'
          ? login.state.toLowerCase() === current.state.toLowerCase()
          : true;
      const cityMatch =
        (login.city || login.cityRegion) && current.city !== 'Unknown'
          ? (login.city || login.cityRegion)?.toLowerCase() === current.city.toLowerCase()
          : true;
      return stateMatch && cityMatch;
    });

    if (!knownLocation) {
      isNewLocation = true;
    }
  }

  const isNewDevice = !knownDevice;
  const requiresOtp = isNewDevice || isNewLocation;

  return {
    isNewDevice,
    isNewLocation,
    requiresOtp,
    reason: isNewDevice ? 'NEW_DEVICE' : isNewLocation ? 'NEW_LOCATION' : undefined,
  };
}
