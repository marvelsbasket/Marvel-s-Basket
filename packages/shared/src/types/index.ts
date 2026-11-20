/**
 * Marvel's Basket — Shared Common Types and Response Interfaces
 */

import { ProductStatus } from '../enums';

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

// =============================================================================
// Master Product Catalog & Categories Types (Phase 08)
// =============================================================================

export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  taxCode?: string | null;
  defaultGstRate?: number | null;
  productCount?: number;
  subcategories: CategoryTreeItem[];
  parent?: { id: string; name: string; slug: string } | null;
}

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  isActive: boolean;
  productCount?: number;
}

export interface ProductImageItem {
  id: string;
  imageUrl: string;
  publicId?: string | null;
  altText: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ProductVariantItem {
  id: string;
  productId: string;
  name: string;
  packSize: string | null;
  unitValue: number | null;
  unitType: string | null;
  mrp: number;
  sku: string | null;
  barcode: string | null;
  primaryImageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  attributes?: Record<string, unknown> | null;
  images: ProductImageItem[];

  // Store-specific pricing & availability
  sellingPrice?: number;
  availableQuantity?: number;
  isAvailable?: boolean;
  discountPercent?: number;
  sellerProductId?: string;
}

export interface ProductCardItem {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category: { id: string; name: string; slug: string };
  primaryImageUrl: string | null;
  foodPreference: string;
  variants: ProductVariantItem[];
  defaultVariant: ProductVariantItem;

  // Selected store context
  store: { id: string; name: string; slug?: string; deliveryTimeMinutes?: number } | null;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  availableQuantity: number;
  isAvailable: boolean;
}

export interface ProductDetailItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  brand: string | null;
  brandDetails?: BrandItem | null;
  categoryId?: string;
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: { id: string; name: string; slug: string } | null;
  };
  primaryImageUrl?: string | null;
  images?: ProductImageItem[];
  mrp?: number;
  sellingPrice?: number;
  foodPreference: string;
  countryOfOrigin: string | null;
  manufacturerDetails: string | null;
  packerDetails: string | null;
  shelfLife: string | null;
  storageInstructions: string | null;
  ingredients: string | null;
  nutritionalInfo: Record<string, unknown> | null;
  specifications: Record<string, unknown> | null;
  attributes: Record<string, unknown> | null;
  searchTags: string[];
  status: string;
  variants: ProductVariantItem[];
  store: { id: string; name: string; slug?: string; deliveryTimeMinutes?: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  parentId?: string | null;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  taxCode?: string;
  defaultGstRate?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  parentId?: string | null;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  taxCode?: string;
  defaultGstRate?: number;
}

export interface CreateBrandRequest {
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateBrandRequest {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateProductVariantInput {
  name: string;
  packSize?: string;
  unitValue?: number;
  unitType?: string;
  mrp: number;
  sku?: string;
  barcode?: string;
  primaryImageUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
  attributes?: Record<string, unknown>;
}

export interface CreateProductRequest {
  categoryId: string;
  brandId?: string;
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  brand?: string;
  foodPreference?: string;
  countryOfOrigin?: string;
  manufacturerDetails?: string;
  packerDetails?: string;
  shelfLife?: string;
  storageInstructions?: string;
  ingredients?: string;
  nutritionalInfo?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  searchTags?: string[];
  isFeatured?: boolean;
  initialVariant?: CreateProductVariantInput;
}

export interface UpdateProductRequest {
  categoryId?: string;
  brandId?: string;
  name?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  brand?: string;
  foodPreference?: string;
  countryOfOrigin?: string;
  manufacturerDetails?: string;
  packerDetails?: string;
  shelfLife?: string;
  storageInstructions?: string;
  ingredients?: string;
  nutritionalInfo?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  searchTags?: string[];
  isFeatured?: boolean;
}

export interface UpdateProductStatusRequest {
  status: ProductStatus | 'DRAFT' | 'ACTIVE' | 'DISCONTINUED' | 'INACTIVE';
  reason?: string;
}

export interface UpdateProductVariantRequest {
  name?: string;
  packSize?: string;
  unitValue?: number;
  unitType?: string;
  mrp?: number;
  sku?: string;
  barcode?: string;
  primaryImageUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
  attributes?: Record<string, unknown>;
}

export interface CatalogStoreMappingItem {
  sellerId: string;
  storeName: string;
  storeCity: string;
  sellingPrice: number;
  mrp: number | null;
  availableStock: number;
  lowStockThreshold: number;
  status: string;
  lastInventoryUpdate: string;
}

// ==============================================================================
// PHASE 09: SELLER LISTINGS & INVENTORY MANAGEMENT
// ==============================================================================

export interface CreateSellerListingRequest {
  productId: string;
  variantId: string;
  sellingPrice: number;
  initialStock?: number;
  lowStockThreshold?: number;
  sellerSku?: string;
  status?: string;
}

export interface UpdateSellerListingRequest {
  sellingPrice?: number;
  sellerSku?: string;
  status?: string;
  lowStockThreshold?: number;
}

export interface UpdateListingPriceRequest {
  sellingPrice: number;
}

export interface UpdateListingStatusRequest {
  status: 'ACTIVE' | 'PAUSED' | 'OUT_OF_STOCK' | 'DISABLED';
  reason?: string;
}

export interface SellerListingItem {
  id: string;
  sellerId: string;
  productId: string;
  productName: string;
  productSlug: string;
  categoryName: string;
  brandName?: string | null;
  variantId: string;
  variantName: string;
  packSize?: string | null;
  sku?: string | null;
  sellerSku?: string | null;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  status: string;
  imageUrl?: string | null;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface InventoryOverviewMetrics {
  totalListedProducts: number;
  activeListings: number;
  pausedListings: number;
  outOfStockListings: number;
  lowStockListings: number;
  totalStockOnHand: number;
  totalReservedStock: number;
  totalAvailableStock: number;
}

export interface AdjustStockRequest {
  operation:
    | 'RESTOCK'
    | 'MANUAL_INCREASE'
    | 'MANUAL_DECREASE'
    | 'DAMAGED_STOCK_WRITEOFF'
    | 'EXPIRED_STOCK_WRITEOFF'
    | 'PICKER_SHORTAGE_WRITEOFF'
    | 'INVENTORY_CORRECTION';
  quantity: number;
  note: string;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey?: string;
}

export interface InventoryAdjustmentHistoryItem {
  id: string;
  inventoryId: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  performedBy?: string | null;
  createdAt: string;
}

export interface InventoryReconciliationResult {
  inventoryId: string;
  sellerProductId: string;
  productName: string;
  variantName: string;
  currentStockOnHand: number;
  calculatedStockFromLedger: number;
  discrepancy: number;
  isReconciled: boolean;
  totalStockIn: number;
  totalStockOut: number;
  totalWriteOffs: number;
}

export interface CartItemRevalidationInput {
  listingId?: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
}

export interface CartItemRevalidationResult {
  variantId: string;
  listingId: string;
  productName: string;
  packSize?: string | null;
  requestedQuantity: number;
  availableQuantity: number;
  adjustedQuantity: number;
  originalUnitPrice: number;
  currentUnitPrice: number;
  priceChanged: boolean;
  isAvailable: boolean;
  status: string;
  message?: string;
}

export interface CartRevalidationResponse {
  storeId: string;
  storeName: string;
  isStoreAcceptingOrders: boolean;
  isStoreServiceable: boolean;
  items: CartItemRevalidationResult[];
  hasPriceChanges: boolean;
  hasQuantityAdjustments: boolean;
  isOrderable: boolean;
  revalidationTimestamp: string;
}

export interface CreateStockReservationRequest {
  storeId: string;
  items: Array<{
    variantId?: string;
    listingId?: string;
    quantity: number;
  }>;
  checkoutSessionId: string;
  cartId?: string;
  ttlMinutes?: number;
  idempotencyKey: string;
}

export interface StockReservationResult {
  reservationId: string;
  checkoutSessionId: string;
  status: string;
  expiresAt: string;
  items: Array<{
    inventoryId: string;
    listingId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface CommitReservationRequest {
  checkoutSessionId: string;
  orderId?: string;
  idempotencyKey: string;
}

export interface ReleaseReservationRequest {
  checkoutSessionId: string;
  reason?: string;
  idempotencyKey?: string;
}

export interface PickerShortageWriteOffRequest {
  storeId: string;
  listingId: string;
  shortageQuantity: number;
  orderId?: string;
  reason: string;
  pickerId: string;
  idempotencyKey: string;
}
