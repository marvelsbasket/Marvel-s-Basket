export const NOTIFICATIONS_QUEUE = 'notifications';

export const NOTIFICATION_JOB_MAX_ATTEMPTS = 5;
export const NOTIFICATION_JOB_BASE_DELAY_MS = 2000;

const PERMANENT_ERROR_PATTERNS = [
  /invalid.*email/i,
  /invalid.*recipient/i,
  /unregistered/i,
  /invalid.*token/i,
  /invalid.*api.*key/i,
  /unauthorized/i,
  /forbidden/i,
  /validation_error/i,
  /not found/i,
  /bounced/i,
];

/**
 * Classifies whether a provider or dispatch error is permanent (no retry)
 * versus temporary (eligible for exponential backoff + jitter).
 */
export function isPermanentNotificationFailure(errorMessage: string): boolean {
  return PERMANENT_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage));
}

/**
 * Computes exponential backoff with +/- 20% randomized jitter.
 */
export function computeRetryDelayMs(attempt: number): number {
  const exp = NOTIFICATION_JOB_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1));
  const capped = Math.min(exp, 5 * 60 * 1000);
  const jitter = capped * (0.8 + Math.random() * 0.4);
  return Math.round(jitter);
}
