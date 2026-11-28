import * as crypto from 'crypto';

/**
 * Constant-time hex string comparison to prevent timing side-channel attacks.
 */
function timingSafeHexEqual(expectedHex: string, actualHex: string): boolean {
  if (!expectedHex || !actualHex) return false;
  const expectedBuf = Buffer.from(expectedHex, 'utf8');
  const actualBuf = Buffer.from(actualHex, 'utf8');
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verifies Razorpay Standard Checkout callback signature:
 * HMAC-SHA256(storedRazorpayOrderId + "|" + razorpayPaymentId, keySecret)
 */
export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const { orderId, paymentId, signature, keySecret } = params;
  if (!orderId || !paymentId || !signature || !keySecret) {
    return false;
  }

  const message = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(message, 'utf8')
    .digest('hex');

  return timingSafeHexEqual(expectedSignature, signature.trim());
}

/**
 * Verifies Razorpay Webhook signature against the exact raw HTTP request body.
 * Supports safe webhook secret rotation via optional previousWebhookSecret.
 */
export function verifyWebhookSignature(params: {
  rawBody: Buffer | string;
  signature: string;
  webhookSecret: string;
  previousWebhookSecret?: string;
}): { valid: boolean; usedPreviousSecret: boolean } {
  const { rawBody, signature, webhookSecret, previousWebhookSecret } = params;
  if (!rawBody || !signature || !webhookSecret) {
    return { valid: false, usedPreviousSecret: false };
  }

  const trimmedSig = signature.trim();
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');

  const expectedPrimary = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyBuffer)
    .digest('hex');

  if (timingSafeHexEqual(expectedPrimary, trimmedSig)) {
    return { valid: true, usedPreviousSecret: false };
  }

  if (previousWebhookSecret && previousWebhookSecret.trim().length > 0) {
    const expectedPrevious = crypto
      .createHmac('sha256', previousWebhookSecret.trim())
      .update(bodyBuffer)
      .digest('hex');

    if (timingSafeHexEqual(expectedPrevious, trimmedSig)) {
      return { valid: true, usedPreviousSecret: true };
    }
  }

  return { valid: false, usedPreviousSecret: false };
}
