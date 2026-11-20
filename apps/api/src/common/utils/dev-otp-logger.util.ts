/**
 * Development Email OTP Logger Utility
 *
 * Exposes generated verification OTPs in the terminal during local development
 * to enable seamless registration and verification workflows without requiring
 * live email delivery.
 *
 * CRITICAL SECURITY INVARIANT:
 * This utility MUST NEVER output OTP values in production environments.
 * The production check is hard-coded and cannot be bypassed by configuration.
 */

export interface DevEmailOtpLogParams {
  purpose?: string;
  email: string;
  otp: string;
  expiresAt: Date;
  nodeEnv: string;
  devLogEnabled: boolean;
}

/**
 * Formats the structured development OTP box for console/terminal display.
 */
export function formatDevOtpBox(params: {
  purpose?: string;
  email: string;
  otp: string;
  expiresAt: Date;
}): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = params.expiresAt;
  const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  return [
    '==================================================',
    '[DEV EMAIL OTP]',
    `Purpose: ${params.purpose || 'Email Verification'}`,
    `Email: ${params.email}`,
    `OTP: ${params.otp}`,
    `Expires At: ${formattedDate}`,
    '==================================================',
  ].join('\n');
}

/**
 * Conditionally logs the development email OTP to console/terminal.
 * Returns true if the OTP was printed, false if suppressed (e.g. in production or when disabled).
 */
export function logDevEmailOtp(params: DevEmailOtpLogParams): boolean {
  // 1. HARD SECURITY GUARD: NEVER log OTP in production under any circumstance.
  if (params.nodeEnv === 'production') {
    return false;
  }

  // 2. Only log in development environment when dev logging is enabled
  if (params.nodeEnv !== 'development' || !params.devLogEnabled) {
    return false;
  }

  // 3. Structured terminal log format
  const box = formatDevOtpBox(params);
  console.log(box);
  return true;
}
