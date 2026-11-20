/**
 * Centralized API Endpoints Directory
 * Mirrors backend routes in apps/api (Version 1).
 */

export const ENDPOINTS = {
  HEALTH: {
    ROOT: '/health',
    LIVE: '/health/live',
    READY: '/health/ready',
  },
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_OTP: '/auth/resend-verification-otp',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    LOGOUT_ALL: '/auth/logout-all',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    ME: '/auth/me',
  },
  USERS: {
    ME: '/users/me',
    ACCOUNT: '/users/me/account',
    PREFERENCES: '/users/me/preferences',
    DEACTIVATE: '/users/me/deactivate',
  },
  ADDRESSES: {
    LIST: '/addresses',
    CREATE: '/addresses',
    DETAIL: (id: string) => `/addresses/${id}`,
    UPDATE: (id: string) => `/addresses/${id}`,
    DELETE: (id: string) => `/addresses/${id}`,
    SET_DEFAULT: (id: string) => `/addresses/${id}/default`,
  },
  SELLERS: {
    APPLICATION: '/sellers/applications',
    MY_APPLICATION: '/sellers/me/application',
    SUBMIT_APPLICATION: '/sellers/me/application/submit',
    STATUS: '/sellers/me/status',
    PROFILE: '/sellers/me/profile',
    STORE: '/sellers/me/store',
    DOCUMENTS: '/sellers/me/documents',
    DOCUMENT: (id: string) => `/sellers/me/documents/${id}`,
  },
  ADMIN_SELLERS: {
    LIST: '/admin/sellers',
    DETAIL: (id: string) => `/admin/sellers/${id}`,
    REVIEW_DOCUMENT: (id: string, docId: string) =>
      `/admin/sellers/${id}/documents/${docId}/review`,
    DOCUMENT_PREVIEW: (id: string, docId: string) =>
      `/admin/sellers/${id}/documents/${docId}/preview`,
    APPROVE: (id: string) => `/admin/sellers/${id}/approve`,
    REJECT: (id: string) => `/admin/sellers/${id}/reject`,
    SUSPEND: (id: string) => `/admin/sellers/${id}/suspend`,
    REACTIVATE: (id: string) => `/admin/sellers/${id}/reactivate`,
    HISTORY: (id: string) => `/admin/sellers/${id}/history`,
  },
  CATEGORIES: {
    TREE: '/categories',
    BY_SLUG: (slug: string) => `/categories/${slug}`,
  },
  BRANDS: {
    LIST: '/brands',
    DETAIL: (id: string) => `/brands/${id}`,
  },
  PRODUCTS: {
    LIST: '/products',
    BY_SLUG: (slug: string) => `/products/${slug}`,
    SEARCH_SUGGESTIONS: '/products/search/suggestions',
  },
  ADMIN_CATEGORIES: {
    LIST: '/admin/categories',
    DETAIL: (id: string) => `/admin/categories/${id}`,
    CREATE: '/admin/categories',
    UPDATE: (id: string) => `/admin/categories/${id}`,
    DELETE: (id: string) => `/admin/categories/${id}`,
    REORDER: '/admin/categories/reorder',
    UPLOAD_ICON: (id: string) => `/admin/categories/${id}/icon`,
    UPLOAD_IMAGE: (id: string) => `/admin/categories/${id}/image`,
  },
  ADMIN_BRANDS: {
    LIST: '/admin/brands',
    DETAIL: (id: string) => `/admin/brands/${id}`,
    CREATE: '/admin/brands',
    UPDATE: (id: string) => `/admin/brands/${id}`,
    DELETE: (id: string) => `/admin/brands/${id}`,
    UPLOAD_LOGO: (id: string) => `/admin/brands/${id}/logo`,
  },
  ADMIN_PRODUCTS: {
    LIST: '/admin/products',
    DETAIL: (id: string) => `/admin/products/${id}`,
    CREATE: '/admin/products',
    UPDATE: (id: string) => `/admin/products/${id}`,
    STATUS: (id: string) => `/admin/products/${id}/status`,
    DELETE: (id: string) => `/admin/products/${id}`,
    ADD_VARIANT: (id: string) => `/admin/products/${id}/variants`,
    UPDATE_VARIANT: (id: string, variantId: string) =>
      `/admin/products/${id}/variants/${variantId}`,
    DELETE_VARIANT: (id: string, variantId: string) =>
      `/admin/products/${id}/variants/${variantId}`,
    UPLOAD_VARIANT_IMAGE: (id: string, variantId: string) =>
      `/admin/products/${id}/variants/${variantId}/images`,
    DELETE_VARIANT_IMAGE: (id: string, variantId: string, imageId: string) =>
      `/admin/products/${id}/variants/${variantId}/images/${imageId}`,
    STORE_LISTINGS: (id: string) => `/admin/products/${id}/store-listings`,
  },
  SELLER_CATALOG: {
    BROWSE: '/seller/catalog/products',
  },
  INVENTORY: {
    SELLER_LISTINGS: (storeId: string) => `/seller/stores/${storeId}/listings`,
    SELLER_LISTING_DETAIL: (storeId: string, listingId: string) =>
      `/seller/stores/${storeId}/listings/${listingId}`,
    SELLER_LISTING_PRICE: (storeId: string, listingId: string) =>
      `/seller/stores/${storeId}/listings/${listingId}/price`,
    SELLER_LISTING_STATUS: (storeId: string, listingId: string) =>
      `/seller/stores/${storeId}/listings/${listingId}/status`,
    SELLER_OVERVIEW: (storeId: string) => `/seller/stores/${storeId}/inventory`,
    LISTING_INVENTORY: (storeId: string, listingId: string) =>
      `/seller/stores/${storeId}/inventory/${listingId}`,
    ADJUST_STOCK: (storeId: string, listingId: string) =>
      `/seller/stores/${storeId}/inventory/${listingId}/adjustments`,
    HISTORY: (storeId: string, listingId: string) =>
      `/seller/stores/${storeId}/inventory/${listingId}/history`,
    RECONCILE: (storeId: string) => `/seller/stores/${storeId}/inventory/reconcile`,
    REVALIDATE_CART: '/inventory/revalidate-cart',
    RESERVATIONS: '/inventory/reservations',
    RELEASE_RESERVATION: (reservationId: string) =>
      `/inventory/reservations/${reservationId}/release`,
    COMMIT_RESERVATION: (reservationId: string) =>
      `/inventory/reservations/${reservationId}/commit`,
  },
} as const;
