import { NotificationChannel, NotificationPriority, NotificationType } from '@prisma/client';

export type NotificationRecipientRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';

export interface NotificationEventDefinition {
  eventKey: string;
  description: string;
  category: NotificationType;
  recipientRole: NotificationRecipientRole;
  channels: NotificationChannel[];
  /**
   * Mandatory transactional/security notifications cannot be silenced by
   * promotional or non-critical channel/category opt-outs.
   */
  isMandatory: boolean;
  priority: NotificationPriority;
  templateId: string;
}

export const NOTIFICATION_EVENTS = {
  // Account & Security
  ACCOUNT_REGISTERED: {
    eventKey: 'ACCOUNT_REGISTERED',
    description: 'Customer or seller account registered successfully',
    category: NotificationType.ACCOUNT,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.NORMAL,
    templateId: 'account_registered_v1',
  },
  ACCOUNT_EMAIL_VERIFIED: {
    eventKey: 'ACCOUNT_EMAIL_VERIFIED',
    description: 'User verified email address',
    category: NotificationType.ACCOUNT,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.NORMAL,
    templateId: 'account_email_verified_v1',
  },
  ACCOUNT_PASSWORD_CHANGED: {
    eventKey: 'ACCOUNT_PASSWORD_CHANGED',
    description: 'Account password was changed or reset',
    category: NotificationType.ACCOUNT,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'account_password_changed_v1',
  },

  // Orders — Customer
  ORDER_PLACED_CUSTOMER: {
    eventKey: 'ORDER_PLACED_CUSTOMER',
    description: 'Order placed by customer',
    category: NotificationType.ORDER,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'order_placed_customer_v1',
  },
  ORDER_CONFIRMED: {
    eventKey: 'ORDER_CONFIRMED',
    description: 'Order confirmed by seller',
    category: NotificationType.ORDER,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.NORMAL,
    templateId: 'order_status_v1',
  },
  ORDER_PACKED: {
    eventKey: 'ORDER_PACKED',
    description: 'Order packed and ready for dispatch',
    category: NotificationType.ORDER,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.NORMAL,
    templateId: 'order_status_v1',
  },
  ORDER_OUT_FOR_DELIVERY: {
    eventKey: 'ORDER_OUT_FOR_DELIVERY',
    description: 'Order dispatched for delivery',
    category: NotificationType.DELIVERY,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'order_status_v1',
  },
  ORDER_DELIVERED: {
    eventKey: 'ORDER_DELIVERED',
    description: 'Order delivered to customer',
    category: NotificationType.DELIVERY,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'order_delivered_v1',
  },
  ORDER_CANCELLED_CUSTOMER: {
    eventKey: 'ORDER_CANCELLED_CUSTOMER',
    description: 'Order cancelled',
    category: NotificationType.ORDER,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'order_status_v1',
  },
  ORDER_REJECTED: {
    eventKey: 'ORDER_REJECTED',
    description: 'Order rejected by store',
    category: NotificationType.ORDER,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'order_status_v1',
  },

  // Orders — Seller
  ORDER_PLACED_SELLER: {
    eventKey: 'ORDER_PLACED_SELLER',
    description: 'New order received by seller store',
    category: NotificationType.ORDER,
    recipientRole: 'SELLER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'order_placed_seller_v1',
  },
  ORDER_CANCELLED_SELLER: {
    eventKey: 'ORDER_CANCELLED_SELLER',
    description: 'Order cancelled — notify seller',
    category: NotificationType.ORDER,
    recipientRole: 'SELLER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.NORMAL,
    templateId: 'order_cancelled_seller_v1',
  },

  // Payments & Refunds
  PAYMENT_SUCCEEDED: {
    eventKey: 'PAYMENT_SUCCEEDED',
    description: 'Online payment captured/verified',
    category: NotificationType.PAYMENT,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'payment_succeeded_v1',
  },
  PAYMENT_FAILED: {
    eventKey: 'PAYMENT_FAILED',
    description: 'Online payment failed',
    category: NotificationType.PAYMENT,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'payment_failed_v1',
  },
  REFUND_INITIATED: {
    eventKey: 'REFUND_INITIATED',
    description: 'Refund initiated for customer order',
    category: NotificationType.REFUND,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.NORMAL,
    templateId: 'refund_initiated_v1',
  },
  REFUND_COMPLETED: {
    eventKey: 'REFUND_COMPLETED',
    description: 'Refund processed/settled',
    category: NotificationType.REFUND,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'refund_completed_v1',
  },
  REFUND_FAILED_ADMIN: {
    eventKey: 'REFUND_FAILED_ADMIN',
    description: 'Refund failed requiring admin intervention',
    category: NotificationType.SYSTEM,
    recipientRole: 'ADMIN',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.CRITICAL,
    templateId: 'admin_alert_v1',
  },

  // Delivery
  DELIVERY_STATUS_UPDATED: {
    eventKey: 'DELIVERY_STATUS_UPDATED',
    description: 'Delivery milestone or rider assignment update',
    category: NotificationType.DELIVERY,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: true,
    priority: NotificationPriority.NORMAL,
    templateId: 'delivery_update_v1',
  },
  DELIVERY_FAILED_ADMIN: {
    eventKey: 'DELIVERY_FAILED_ADMIN',
    description: 'Delivery failed requiring admin attention',
    category: NotificationType.SYSTEM,
    recipientRole: 'ADMIN',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.CRITICAL,
    templateId: 'admin_alert_v1',
  },

  // Seller Onboarding & Store Lifecycle
  SELLER_APPLICATION_SUBMITTED: {
    eventKey: 'SELLER_APPLICATION_SUBMITTED',
    description: 'Seller application submitted for review',
    category: NotificationType.ACCOUNT,
    recipientRole: 'SELLER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.NORMAL,
    templateId: 'seller_application_submitted_v1',
  },
  SELLER_APPLICATION_ADMIN: {
    eventKey: 'SELLER_APPLICATION_ADMIN',
    description: 'New or resubmitted seller KYC application for admin review',
    category: NotificationType.SYSTEM,
    recipientRole: 'ADMIN',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'admin_alert_v1',
  },
  SELLER_APPROVED: {
    eventKey: 'SELLER_APPROVED',
    description: 'Seller store approved & activated',
    category: NotificationType.ACCOUNT,
    recipientRole: 'SELLER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'seller_approved_v1',
  },
  SELLER_REJECTED: {
    eventKey: 'SELLER_REJECTED',
    description: 'Seller KYC rejected / action required',
    category: NotificationType.ACCOUNT,
    recipientRole: 'SELLER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'seller_rejected_v1',
  },
  SELLER_SUSPENDED: {
    eventKey: 'SELLER_SUSPENDED',
    description: 'Seller store suspended',
    category: NotificationType.ACCOUNT,
    recipientRole: 'SELLER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.CRITICAL,
    templateId: 'seller_suspended_v1',
  },
  SELLER_REACTIVATED: {
    eventKey: 'SELLER_REACTIVATED',
    description: 'Seller store reactivated',
    category: NotificationType.ACCOUNT,
    recipientRole: 'SELLER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'seller_reactivated_v1',
  },

  // Reviews & Moderation
  REVIEW_APPROVED: {
    eventKey: 'REVIEW_APPROVED',
    description: 'Customer product review approved by moderator',
    category: NotificationType.REVIEW,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: false,
    priority: NotificationPriority.LOW,
    templateId: 'review_moderated_v1',
  },
  REVIEW_REJECTED: {
    eventKey: 'REVIEW_REJECTED',
    description: 'Customer product review rejected or hidden by moderator',
    category: NotificationType.REVIEW,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP],
    isMandatory: false,
    priority: NotificationPriority.NORMAL,
    templateId: 'review_moderated_v1',
  },
  REVIEW_REPORTED_ADMIN: {
    eventKey: 'REVIEW_REPORTED_ADMIN',
    description: 'Customer reported a product review for moderation',
    category: NotificationType.SYSTEM,
    recipientRole: 'ADMIN',
    channels: [NotificationChannel.IN_APP],
    isMandatory: true,
    priority: NotificationPriority.HIGH,
    templateId: 'admin_alert_v1',
  },

  // Promotional / Marketplace Announcements (Optional, preference-controlled)
  PROMOTION_ANNOUNCEMENT: {
    eventKey: 'PROMOTION_ANNOUNCEMENT',
    description: 'Platform promotional announcement or offer',
    category: NotificationType.PROMOTION,
    recipientRole: 'CUSTOMER',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isMandatory: false,
    priority: NotificationPriority.LOW,
    templateId: 'promotion_announcement_v1',
  },
} as const satisfies Record<string, NotificationEventDefinition>;

export type NotificationEventKey = keyof typeof NOTIFICATION_EVENTS;
