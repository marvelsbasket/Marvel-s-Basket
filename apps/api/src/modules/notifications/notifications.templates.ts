import { NotificationEventKey } from './notifications.events';

export interface RenderedNotificationContent {
  title: string;
  message: string;
  actionUrl: string | null;
  emailSubject: string;
  emailHtml: string;
  emailText: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeActionUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  return trimmed;
}

function wrapEmailHtml(title: string, bodyParagraphs: string[], actionLabel?: string, actionUrl?: string | null): string {
  const safeTitle = escapeHtml(title);
  const paragraphsHtml = bodyParagraphs
    .map((p) => `<p style="margin:0 0 12px;color:#1F2937;font-size:15px;line-height:1.6;">${escapeHtml(p)}</p>`)
    .join('');

  const ctaHtml =
    actionLabel && actionUrl
      ? `<p style="margin:20px 0 8px;"><span style="display:inline-block;background:#0F5132;color:#FFFFFF;padding:10px 18px;border-radius:8px;font-weight:700;font-size:14px;">${escapeHtml(actionLabel)}: ${escapeHtml(actionUrl)}</span></p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#FBFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;">
    <div style="background:#0F5132;padding:18px 24px;">
      <span style="color:#FFFFFF;font-weight:800;font-size:18px;letter-spacing:-0.02em;">Marvel's Basket</span>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 14px;color:#0A2E1A;font-size:20px;font-weight:800;">${safeTitle}</h1>
      ${paragraphsHtml}
      ${ctaHtml}
    </div>
    <div style="background:#F3F4F6;padding:14px 24px;color:#6B7280;font-size:12px;">
      This is an automated notification from Marvel's Basket. Please do not share sensitive account details.
    </div>
  </div>
</body>
</html>`;
}

export function renderNotificationTemplate(
  eventKey: NotificationEventKey,
  payload: Record<string, unknown>,
): RenderedNotificationContent {
  const orderNumber = String(payload.orderNumber || '');
  const storeName = String(payload.storeName || "Marvel's Basket Store");
  const orderId = String(payload.orderId || '');
  const reason = typeof payload.reason === 'string' && payload.reason.trim() ? payload.reason.trim() : '';
  const totalAmount =
    typeof payload.totalAmount === 'number' ? `₹${payload.totalAmount.toFixed(2)}` : '';

  let title = String(payload.title || "Marvel's Basket Update");
  let message = String(payload.message || 'You have a new notification.');
  let actionUrl = sanitizeActionUrl(payload.actionUrl);

  switch (eventKey) {
    case 'ACCOUNT_REGISTERED':
      title = "Welcome to Marvel's Basket";
      message = 'Your account has been created. Start exploring fresh groceries from nearby local stores.';
      actionUrl = actionUrl ?? '/';
      break;
    case 'ACCOUNT_EMAIL_VERIFIED':
      title = 'Email verified';
      message = 'Your email address has been verified successfully.';
      actionUrl = actionUrl ?? '/account';
      break;
    case 'ACCOUNT_PASSWORD_CHANGED':
      title = 'Password updated';
      message = 'Your account password was recently changed. If this was not you, reset your password immediately.';
      actionUrl = actionUrl ?? '/account';
      break;
    case 'ORDER_PLACED_CUSTOMER':
      title = `Order ${orderNumber} placed`;
      message = `Your order${totalAmount ? ` of ${totalAmount}` : ''} from ${storeName} has been placed and is awaiting store confirmation.`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'ORDER_PLACED_SELLER':
      title = `New order ${orderNumber}`;
      message = `You received a new order${totalAmount ? ` of ${totalAmount}` : ''}. Please review and accept.`;
      actionUrl = actionUrl ?? '/seller/orders';
      break;
    case 'ORDER_CONFIRMED':
      title = `Order ${orderNumber} confirmed`;
      message = `Your order ${orderNumber} from ${storeName} has been confirmed by the store.`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'ORDER_PACKED':
      title = `Order ${orderNumber} packed`;
      message = `Your order ${orderNumber} from ${storeName} is packed and ready for dispatch.`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'ORDER_OUT_FOR_DELIVERY':
      title = `Order ${orderNumber} out for delivery`;
      message = `Your order ${orderNumber} from ${storeName} is out for delivery.`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'ORDER_DELIVERED':
      title = `Order ${orderNumber} delivered`;
      message = `Your order ${orderNumber} from ${storeName} has been delivered. Thank you for shopping with Marvel's Basket!`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'ORDER_CANCELLED_CUSTOMER':
      title = `Order ${orderNumber} cancelled`;
      message = `Your order ${orderNumber} from ${storeName} was cancelled.${reason ? ` Reason: ${reason}` : ''}`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'ORDER_CANCELLED_SELLER':
      title = `Order ${orderNumber} cancelled`;
      message = `Order ${orderNumber} was cancelled.${reason ? ` Reason: ${reason}` : ''}`;
      actionUrl = actionUrl ?? '/seller/orders';
      break;
    case 'ORDER_REJECTED':
      title = `Order ${orderNumber} rejected`;
      message = `Your order ${orderNumber} from ${storeName} was rejected by the store.${reason ? ` Reason: ${reason}` : ''}`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'PAYMENT_SUCCEEDED':
      title = `Payment confirmed for ${orderNumber}`;
      message = `Your payment${totalAmount ? ` of ${totalAmount}` : ''} for order ${orderNumber} was verified successfully.`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'PAYMENT_FAILED':
      title = `Payment failed for ${orderNumber}`;
      message = `Payment for order ${orderNumber} could not be completed.${reason ? ` ${reason}` : ' Please retry from your order details.'}`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'REFUND_INITIATED':
      title = `Refund initiated for ${orderNumber}`;
      message = `A refund${totalAmount ? ` of ${totalAmount}` : ''} for order ${orderNumber} has been initiated.`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'REFUND_COMPLETED':
      title = `Refund completed for ${orderNumber}`;
      message = `Your refund${totalAmount ? ` of ${totalAmount}` : ''} for order ${orderNumber} has been processed.`;
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'DELIVERY_STATUS_UPDATED':
      title = String(payload.eventTitle || `Delivery update for ${orderNumber}`);
      message = String(payload.message || `Your delivery for ${orderNumber} has a new update.`);
      actionUrl = actionUrl ?? (orderId ? `/orders/${orderId}` : '/orders');
      break;
    case 'SELLER_APPLICATION_SUBMITTED':
      title = 'Seller application received';
      message = `Your application for ${storeName} has been submitted and is under review.`;
      actionUrl = actionUrl ?? '/seller/application';
      break;
    case 'SELLER_APPROVED':
      title = 'Store approved & activated';
      message = `Congratulations! Your store ${storeName} is now approved and active on Marvel's Basket.`;
      actionUrl = actionUrl ?? '/seller/profile';
      break;
    case 'SELLER_REJECTED':
      title = 'Action required on seller application';
      message = `Your application for ${storeName} requires updates.${reason ? ` Reason: ${reason}` : ''}`;
      actionUrl = actionUrl ?? '/seller/onboarding';
      break;
    case 'SELLER_SUSPENDED':
      title = 'Store suspended';
      message = `Your store ${storeName} has been suspended.${reason ? ` Reason: ${reason}` : ''}`;
      actionUrl = actionUrl ?? '/seller/profile';
      break;
    case 'SELLER_REACTIVATED':
      title = 'Store reactivated';
      message = `Your store ${storeName} has been reactivated.`;
      actionUrl = actionUrl ?? '/seller/profile';
      break;
    case 'REVIEW_APPROVED':
      title = 'Your review is now live';
      message = `Your review for ${String(payload.productName || 'your purchased product')} has been approved and published.`;
      actionUrl = actionUrl ?? '/reviews';
      break;
    case 'REVIEW_REJECTED':
      title = 'Review moderation update';
      message = `Your review for ${String(payload.productName || 'a product')} was not published.${reason ? ` Reason: ${reason}` : ''}`;
      actionUrl = actionUrl ?? '/reviews';
      break;
    case 'REFUND_FAILED_ADMIN':
    case 'DELIVERY_FAILED_ADMIN':
    case 'SELLER_APPLICATION_ADMIN':
    case 'REVIEW_REPORTED_ADMIN':
    case 'PROMOTION_ANNOUNCEMENT':
    default:
      break;
  }

  const emailSubject = `${title} — Marvel's Basket`;
  const emailText = `${title}\n\n${message}${actionUrl ? `\n\nView details: ${actionUrl}` : ''}\n\nMarvel's Basket`;
  const emailHtml = wrapEmailHtml(title, [message], actionUrl ? 'View Details' : undefined, actionUrl);

  return {
    title,
    message,
    actionUrl,
    emailSubject,
    emailHtml,
    emailText,
  };
}
