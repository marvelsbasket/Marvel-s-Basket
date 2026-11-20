/**
 * Marvel's Basket — Shared Common Types and Response Interfaces
 */

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface HealthStatusResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  environment: string;
}

// =============================================================================
// Authentication & Session Types
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  status: string;
  roles: string[];
  permissions?: string[];
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface LoginResponseData {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

// =============================================================================
// Customer Profile & Account Types (Phase 06)
// =============================================================================

export interface CustomerProfileResponse {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
}

export interface AccountOverviewResponse {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  totalAddresses: number;
}

export interface CustomerAddressResponse {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressRequest {
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export interface UpdateAddressRequest {
  label?: string;
  recipientName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export interface AccountPreferencesResponse {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  promotionalEmails: boolean;
}

export interface UpdateAccountPreferencesRequest {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  inAppNotifications?: boolean;
  promotionalEmails?: boolean;
}

// =============================================================================
// Seller Onboarding & Management Types (Phase 07)
// =============================================================================

export interface SellerDocumentInfo {
  id: string;
  sellerId: string;
  documentType: string;
  documentUrl: string;
  cloudinaryPublicId?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  verificationStatus: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerStatusHistoryItem {
  id: string;
  sellerId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface SellerApplicationData {
  id: string;
  ownerUserId: string;
  businessName: string;
  slug: string;
  businessEmail: string;
  businessPhone: string;
  status: string;
  currentStep: number;
  isSubmitted: boolean;
  submittedAt?: string | null;
  approvalDate?: string | null;
  rejectionReason?: string | null;
  suspensionReason?: string | null;

  // Step 1: Personal profile
  ownerName?: string;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  profilePhotoUrl?: string | null;

  // Step 2: Store info
  storeDisplayName?: string | null;
  storeCategory?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm?: number | null;
  openingTime?: string | null;
  closingTime?: string | null;
  weeklyOffDays?: string | null;
  storefrontPhotoUrl?: string | null;
  storeInteriorPhotoUrl?: string | null;

  // Step 3: Business & Tax
  legalBusinessName?: string | null;
  businessEntityType?: string | null;
  pan?: string | null;
  gstin?: string | null;
  fssaiNumber?: string | null;
  fssaiExpiryDate?: string | null;
  shopEstablishmentNumber?: string | null;

  // Step 4: Bank Details (masked for security)
  bankAccountHolderName?: string | null;
  bankAccountNumberMasked?: string | null;
  bankIfscCode?: string | null;
  bankName?: string | null;
  bankAccountType?: string | null;
  upiId?: string | null;

  // Step 5: Documents
  documents: SellerDocumentInfo[];
  statusHistory?: SellerStatusHistoryItem[];
}

export interface UpdateSellerApplicationRequest {
  currentStep?: number;

  // Step 1
  ownerName?: string;
  businessPhone?: string;
  profilePhotoUrl?: string;

  // Step 2
  storeDisplayName?: string;
  storeCategory?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
  openingTime?: string;
  closingTime?: string;
  weeklyOffDays?: string;
  storefrontPhotoUrl?: string;
  storeInteriorPhotoUrl?: string;

  // Step 3
  legalBusinessName?: string;
  businessEntityType?: string;
  pan?: string;
  gstin?: string;
  fssaiNumber?: string;
  fssaiExpiryDate?: string;
  shopEstablishmentNumber?: string;

  // Step 4
  bankAccountHolderName?: string;
  bankAccountNumber?: string;
  confirmBankAccountNumber?: string;
  bankIfscCode?: string;
  bankName?: string;
  bankAccountType?: string;
  upiId?: string;
}

export interface AdminReviewDocumentRequest {
  status: 'VERIFIED' | 'REJECTED' | 'NEEDS_RESUBMISSION';
  notes?: string;
}

export interface AdminRejectApplicationRequest {
  reason: string;
}

export interface AdminSuspendSellerRequest {
  reason: string;
}
