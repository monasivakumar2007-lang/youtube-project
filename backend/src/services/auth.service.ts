// ============================================================
// src/services/auth.service.ts
// Authentication Business Logic
// ============================================================

import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { hashPassword, verifyPassword, validatePassword } from '../utils/password';
import { generateOtp, hashOtp, verifyOtpHash, getOtpExpiry, isOtpExpired, logDevOtp } from '../utils/otp';
import { signAccessToken } from '../utils/jwt';
import { ClientDeviceInfo, evaluateLoginContext } from '../utils/deviceDetector';
import { sendOtpEmail } from './email.service';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  clientInfo: ClientDeviceInfo;
}

export interface VerifyOtpInput {
  email: string;
  otp: string;
  clientInfo: ClientDeviceInfo;
}

/**
 * Format user-agent string to store device, browser, OS, and raw UA.
 */
function formatUserAgent(clientInfo: ClientDeviceInfo): string {
  return `[${clientInfo.device} | ${clientInfo.browser} | ${clientInfo.operatingSystem}] ${clientInfo.userAgent}`;
}

/**
 * Format location string for cityRegion field.
 */
function formatCityRegion(clientInfo: ClientDeviceInfo): string {
  if (clientInfo.city !== 'Unknown' && clientInfo.country !== 'Unknown') {
    return `${clientInfo.city}, ${clientInfo.country}`;
  }
  return clientInfo.city !== 'Unknown' ? clientInfo.city : 'Unknown';
}

/**
 * Register a new user with USER role and trigger OTP verification.
 */
export async function register(input: RegisterInput) {
  const { name, email, password } = input;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return {
      status: 400,
      body: { success: false, message: 'Name is required.' },
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim().toLowerCase())) {
    return {
      status: 400,
      body: { success: false, message: 'Please provide a valid email address.' },
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Validate password rules (min 8 chars, at least 1 letter, at least 1 number)
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return {
      status: 400,
      body: { success: false, message: passwordValidation.message },
    };
  }

  // Check whether email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return {
      status: 409,
      body: { success: false, message: 'An account with this email already exists.' },
    };
  }

  // Hash password with bcrypt
  const passwordHash = await hashPassword(password);

  // Create user — role always defaults to USER
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role: 'USER',
      planType: 'FREE',
    },
  });

  // Generate 6-digit OTP for registration verification
  const rawOtp = generateOtp();
  const hashedOtp = await hashOtp(rawOtp);
  const expiresAt = getOtpExpiry(env.otpExpiryMinutes);

  await prisma.oTPVerification.create({
    data: {
      userId: user.id,
      otpHash: hashedOtp,
      expiresAt,
      attempts: 0,
      verified: false,
    },
  });

  // Log and dispatch OTP
  logDevOtp(user.email, rawOtp, 'REGISTRATION');
  await sendOtpEmail(user.email, rawOtp, 'REGISTRATION');

  return {
    status: 201,
    body: {
      success: true,
      message: 'Registration successful. A 6-digit verification code has been generated.',
      requiresOtp: true,
      email: user.email,
      devOtp: env.otpDevMode ? rawOtp : undefined,
    },
  };
}

/**
 * Authenticate user credentials and evaluate new device/location.
 */
export async function login(input: LoginInput) {
  const { email, password, clientInfo } = input;

  if (!email || !password) {
    return {
      status: 400,
      body: { success: false, message: 'Email and password are required.' },
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      otpRecords: {
        where: { verified: true },
        take: 1,
      },
    },
  });

  // Generic error response if user not found or password incorrect
  const invalidCredentialsResponse = {
    status: 401,
    body: { success: false, message: 'Invalid email or password.' },
  };

  if (!user) {
    return invalidCredentialsResponse;
  }

  // Compare password using bcrypt
  const isMatch = await verifyPassword(password, user.password);
  if (!isMatch) {
    // Record failed login attempt for audit
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        deviceId: clientInfo.deviceId,
        cityRegion: formatCityRegion(clientInfo),
        state: clientInfo.state,
        ipAddress: clientInfo.ipAddress,
        userAgent: formatUserAgent(clientInfo),
        verified: false,
      },
    }).catch(() => {});

    return invalidCredentialsResponse;
  }

  // Check if account has any verified OTP record
  const isAccountVerified = user.otpRecords.length > 0;

  // Fetch recent login history for device and location comparison
  const previousLogins = await prisma.loginHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      deviceId: true,
      cityRegion: true,
      state: true,
      userAgent: true,
      verified: true,
    },
  });

  const adaptedPreviousLogins = previousLogins.map(
    (l: { deviceId: string; cityRegion: string | null; state: string | null; verified: boolean }) => ({
      deviceId: l.deviceId,
      cityRegion: l.cityRegion,
      state: l.state,
      verified: l.verified,
      successful: l.verified,
      device: clientInfo.device,
      browser: clientInfo.browser,
      operatingSystem: clientInfo.operatingSystem,
    })
  );

  const evaluation = evaluateLoginContext(clientInfo, adaptedPreviousLogins);

  // If new device/location or unverified account, require OTP
  if (evaluation.requiresOtp || !isAccountVerified) {
    const purpose = evaluation.reason || (!isAccountVerified ? 'REGISTRATION' : 'LOGIN');

    // Invalidate previous active OTPs
    await prisma.oTPVerification.updateMany({
      where: { userId: user.id, verified: false },
      data: { verified: true },
    });

    // Generate new OTP
    const rawOtp = generateOtp();
    const hashedOtp = await hashOtp(rawOtp);
    const expiresAt = getOtpExpiry(env.otpExpiryMinutes);

    await prisma.oTPVerification.create({
      data: {
        userId: user.id,
        otpHash: hashedOtp,
        expiresAt,
        attempts: 0,
        verified: false,
      },
    });

    logDevOtp(user.email, rawOtp, purpose);
    await sendOtpEmail(user.email, rawOtp, purpose);

    const message =
      purpose === 'NEW_DEVICE'
        ? 'New device detected. A 6-digit verification code has been sent.'
        : purpose === 'NEW_LOCATION'
        ? 'New location detected. A 6-digit verification code has been sent.'
        : 'Please verify your 6-digit authentication code.';

    return {
      status: 200,
      body: {
        success: true,
        requiresOtp: true,
        purpose,
        message,
        email: user.email,
        devOtp: env.otpDevMode ? rawOtp : undefined,
      },
    };
  }

  // Known device & location -> Create JWT and login history record directly
  const token = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    planType: user.planType,
  });

  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      deviceId: clientInfo.deviceId,
      cityRegion: formatCityRegion(clientInfo),
      state: clientInfo.state,
      ipAddress: clientInfo.ipAddress,
      userAgent: formatUserAgent(clientInfo),
      verified: true,
    },
  });

  return {
    status: 200,
    body: {
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        planType: user.planType,
        themePreference: user.themePreference,
        isEmailVerified: true,
      },
    },
  };
}

/**
 * Verify OTP, mark as verified, record login history, and issue JWT.
 */
export async function verifyOtp(input: VerifyOtpInput) {
  const { email, otp, clientInfo } = input;

  if (!email || !otp) {
    return {
      status: 400,
      body: { success: false, message: 'Email and 6-digit OTP are required.' },
    };
  }

  const cleanOtp = otp.trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    return {
      status: 400,
      body: { success: false, message: 'OTP must be exactly 6 digits.' },
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return {
      status: 404,
      body: { success: false, message: 'User not found.' },
    };
  }

  // Find latest unverified OTP
  const activeOtp = await prisma.oTPVerification.findFirst({
    where: {
      userId: user.id,
      verified: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeOtp) {
    return {
      status: 400,
      body: { success: false, message: 'No active OTP found. Please request a new code.' },
    };
  }

  // Check if expired
  if (isOtpExpired(activeOtp.expiresAt)) {
    return {
      status: 400,
      body: { success: false, message: 'OTP has expired. Please request a new code.' },
    };
  }

  // Check max attempts
  if (activeOtp.attempts >= env.otpMaxAttempts) {
    return {
      status: 429,
      body: {
        success: false,
        message: 'Maximum OTP verification attempts exceeded. Please request a new code.',
      },
    };
  }

  // Verify hash
  const isValid = await verifyOtpHash(cleanOtp, activeOtp.otpHash);

  if (!isValid) {
    const updatedAttempts = activeOtp.attempts + 1;
    await prisma.oTPVerification.update({
      where: { id: activeOtp.id },
      data: { attempts: updatedAttempts },
    });

    const remaining = Math.max(0, env.otpMaxAttempts - updatedAttempts);
    return {
      status: 400,
      body: {
        success: false,
        message:
          remaining > 0
            ? `Invalid OTP. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Maximum OTP attempts exceeded. Please request a new code.',
      },
    };
  }

  // Mark OTP as verified
  await prisma.oTPVerification.update({
    where: { id: activeOtp.id },
    data: { verified: true },
  });

  // Record verified login history with client device/location info
  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      deviceId: clientInfo.deviceId,
      cityRegion: formatCityRegion(clientInfo),
      state: clientInfo.state,
      ipAddress: clientInfo.ipAddress,
      userAgent: formatUserAgent(clientInfo),
      verified: true,
    },
  });

  // Generate JWT access token
  const token = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    planType: user.planType,
  });

  return {
    status: 200,
    body: {
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        planType: user.planType,
        themePreference: user.themePreference,
        isEmailVerified: true,
      },
    },
  };
}

/**
 * Resend OTP with cooldown protection.
 */
export async function resendOtp(email: string) {
  if (!email) {
    return {
      status: 400,
      body: { success: false, message: 'Email is required.' },
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // For security, avoid leaking whether the email exists
    return {
      status: 200,
      body: { success: true, message: 'If this email is registered, a new OTP has been sent.' },
    };
  }

  // Check cooldown: find the most recent OTP created for this user
  const latestOtp = await prisma.oTPVerification.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (latestOtp) {
    const elapsedSeconds = (Date.now() - new Date(latestOtp.createdAt).getTime()) / 1000;
    if (elapsedSeconds < env.otpCooldownSeconds) {
      const waitTime = Math.ceil(env.otpCooldownSeconds - elapsedSeconds);
      return {
        status: 429,
        body: {
          success: false,
          message: `Please wait ${waitTime} seconds before requesting another OTP.`,
        },
      };
    }
  }

  // Invalidate any older active OTPs
  await prisma.oTPVerification.updateMany({
    where: { userId: user.id, verified: false },
    data: { verified: true },
  });

  // Generate and save new OTP
  const rawOtp = generateOtp();
  const hashedOtp = await hashOtp(rawOtp);
  const expiresAt = getOtpExpiry(env.otpExpiryMinutes);

  await prisma.oTPVerification.create({
    data: {
      userId: user.id,
      otpHash: hashedOtp,
      expiresAt,
      attempts: 0,
      verified: false,
    },
  });

  logDevOtp(user.email, rawOtp, 'RESEND');
  await sendOtpEmail(user.email, rawOtp, 'RESEND');

  return {
    status: 200,
    body: {
      success: true,
      message: 'OTP sent successfully.',
      devOtp: env.otpDevMode ? rawOtp : undefined,
    },
  };
}

/**
 * Retrieve current authenticated user profile.
 */
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      planType: true,
      themePreference: true,
      createdAt: true,
      loginHistories: {
        where: { verified: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
      otpRecords: {
        where: { verified: true },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!user) {
    return {
      status: 404,
      body: { success: false, message: 'User not found.' },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        planType: user.planType,
        themePreference: user.themePreference,
        isEmailVerified: user.otpRecords.length > 0,
        lastLoginAt: user.loginHistories[0]?.createdAt || null,
        createdAt: user.createdAt,
      },
    },
  };
}

/**
 * Update user's theme preference (AUTO, LIGHT, DARK)
 */
export async function updateThemePreference(userId: string, themePreference: 'AUTO' | 'LIGHT' | 'DARK') {
  return prisma.user.update({
    where: { id: userId },
    data: { themePreference },
    select: {
      id: true,
      name: true,
      email: true,
      themePreference: true,
      planType: true,
    },
  });
}

/**
 * Get user's login history
 */
export async function getUserLoginHistory(userId: string) {
  return prisma.loginHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      cityRegion: true,
      state: true,
      deviceId: true,
      userAgent: true,
      verified: true,
      createdAt: true,
    },
  });
}

