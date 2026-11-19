/**
 * Marvel's Basket — Shared Business & Technical Constants
 * Aligned with Business Rules (BR-001 through BR-022) & Architecture Decisions.
 */

// Cart and reservation timeout (BR-008)
export const CART_RESERVATION_TIMEOUT_MINUTES = 15;

// Maximum order value permitted for Cash on Delivery (BR-011)
export const MAX_COD_ORDER_VALUE = 2000;

// Default platform commission percentage for seller settlements (BR-015)
export const DEFAULT_PLATFORM_COMMISSION_PERCENTAGE = 10;

// Hyperlocal serviceability default radius in kilometers (BR-003)
export const DEFAULT_DELIVERY_RADIUS_KM = 7;

// API versioning prefix
export const API_VERSION_PREFIX = 'api/v1';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Application defaults
export const APP_NAME = "Marvel's Basket";
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_CURRENCY_SYMBOL = '₹';
