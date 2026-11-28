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

export interface CatalogMetaInfo {
  hasLocationContext: boolean;
  isServiceable: boolean;
  storeId: string | null;
  storeName: string | null;
  storeSlug?: string | null;
  catalogTotalCount?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  metaInfo?: CatalogMetaInfo;
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

export type AddressType = 'HOME' | 'OFFICE' | 'OTHER';

export interface CustomerAddressResponse {
  id: string;
  userId: string;
  addressType?: AddressType;
  label: string;
  recipientName: string;
  phone: string;
  forSomeoneElse?: boolean;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  locality?: string | null;
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
  addressType?: AddressType;
  label: string;
  recipientName: string;
  phone: string;
  forSomeoneElse?: boolean;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export interface UpdateAddressRequest {
  addressType?: AddressType;
  label?: string;
  recipientName?: string;
  phone?: string;
  forSomeoneElse?: boolean;
  addressLine1?: string;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
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
  lowStockThreshold?: number;
  isLowStock?: boolean;
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
  store: {
    id: string;
    name: string;
    slug?: string;
    deliveryTimeMinutes?: number | null;
    deliveryEtaLabel?: string | null;
    isOpen?: boolean;
    isAcceptingOrders?: boolean;
    operationalStatusLabel?: string;
    minimumOrderValue?: number | null;
  } | null;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  availableQuantity: number;
  isAvailable: boolean;
  lowStockThreshold?: number;
  isLowStock?: boolean;
  searchTags?: string[];
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
  store: {
    id: string;
    name: string;
    slug?: string;
    deliveryTimeMinutes?: number | null;
    deliveryEtaLabel?: string | null;
    isOpen?: boolean;
    isAcceptingOrders?: boolean;
    minimumOrderValue?: number | null;
  } | null;
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

// ==============================================================================
// PHASE 10: CUSTOMER SHOPPING EXPERIENCE (LOCATION, STORES, SEARCH, BASKET)
// ==============================================================================

export type LocationSource = 'SAVED_ADDRESS' | 'CURRENT_LOCATION' | 'MANUAL' | 'QUICK_CITY';

export interface DeliveryLocation {
  label?: string;
  addressId?: string | null;
  displayLocation: string;
  fullAddress?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source: LocationSource;
}

export interface StoreBusinessHourItem {
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  isClosed: boolean;
}

export interface PublicStoreCategorySummary {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface PublicStoreItem {
  id: string;
  slug: string;
  name: string;
  storeCategory: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  storefrontPhotoUrl: string | null;
  city: string;
  state: string;
  postalCode: string;
  addressLine1: string;
  latitude: number | null;
  longitude: number | null;
  serviceRadiusKm: number;
  distanceKm: number | null;
  deliveryTimeMinutes: number | null;
  deliveryEtaLabel: string | null;
  isOpen: boolean;
  isAcceptingOrders: boolean;
  isClosingSoon: boolean;
  closingSoonMinutes?: number | null;
  operationalStatusLabel: string;
  openingTime: string | null;
  closingTime: string | null;
  weeklyOffDays: string | null;
  rating: number | null;
  reviewCount: number;
  minimumOrderValue: number | null;
  activeProductCount?: number;
  categories?: PublicStoreCategorySummary[];
  businessHours?: StoreBusinessHourItem[];
}

export interface LocationSuggestionItem {
  label: string;
  displayLocation: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  storeCount: number;
}

export interface ServiceabilityResolutionResponse {
  isServiceable: boolean;
  locationSummary: string;
  activeStore: PublicStoreItem | null;
  nearbyStores: PublicStoreItem[];
  suggestedLocations: LocationSuggestionItem[];
}

export interface ReverseGeocodeResponse {
  formattedAddress: string;
  displayLocation: string;
  locality?: string | null;
  street?: string | null;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string | null;
  latitude: number;
  longitude: number;
  provider: string;
}

export interface PlaceSuggestionItem {
  id: string;
  primaryText: string;
  secondaryText: string;
  fullAddress: string;
  locality: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  storeCount?: number;
  provider: string;
}

export interface SearchSuggestionProductItem {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  primaryImageUrl: string | null;
  defaultVariantId?: string;
  packSize?: string | null;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  availableQuantity: number;
  isAvailable: boolean;
  sellerProductId?: string;
  storeId?: string | null;
  storeName?: string | null;
}

export interface SearchSuggestionsResponse {
  products: SearchSuggestionProductItem[];
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
}

export interface BasketStoreInfo {
  id: string;
  name: string;
  slug: string;
  deliveryTimeMinutes?: number | null;
  deliveryEtaLabel?: string | null;
  isOpen?: boolean;
  isAcceptingOrders?: boolean;
  operationalStatusLabel?: string;
  minimumOrderValue?: number | null;
}

export interface BasketItem {
  id?: string;
  sellerProductId: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  brand: string | null;
  packSize: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  mrp: number;
  discountPercent: number;
  availableQuantity: number;
  isAvailable: boolean;
  priceChanged?: boolean;
  originalUnitPrice?: number;
  statusMessage?: string;
}

export interface BasketStateResponse {
  cartId?: string | null;
  sellerId: string | null;
  store: BasketStoreInfo | null;
  items: BasketItem[];
  itemCount: number;
  totalUnits: number;
  subtotal: number;
  totalMrp: number;
  totalSavings: number;
  hasUnavailableItems?: boolean;
  hasPriceChanges?: boolean;
  appliedCouponCode?: string | null;
  couponDiscount?: number;
  couponMessage?: string | null;
  minimumOrderValue?: number | null;
  movRemaining?: number;
  belowMov?: boolean;
  deliveryFee?: number | null;
  freeDeliveryThreshold?: number | null;
  estimatedTotal?: number;
}

export interface CheckoutPriceBreakdown {
  itemSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  deliveryFee: number;
  taxAmount: number;
  grandTotal: number;
  totalMrp: number;
  totalSavings: number;
}

export interface CheckoutSnapshotItem {
  sellerProductId: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  packSize: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  mrp: number;
  discountPercent: number;
  lineTotal: number;
  taxAmount: number;
}

export interface CheckoutAddressSnapshot {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
}

export type CheckoutSessionStatusType =
  'PREPARED' | 'RESERVATION_ACTIVE' | 'EXPIRED' | 'RELEASED' | 'COMMITTED' | 'CANCELLED';

export interface CheckoutSummaryResponse {
  checkoutSessionId: string;
  cartId: string;
  status: CheckoutSessionStatusType;
  store: BasketStoreInfo;
  address: CheckoutAddressSnapshot;
  distanceKm: number | null;
  items: CheckoutSnapshotItem[];
  couponCode: string | null;
  priceBreakdown: CheckoutPriceBreakdown;
  expiresAt: string;
  serverTime: string;
  remainingSeconds: number;
  isExpired: boolean;
}

export interface StoreSwitchComparison {
  newStore: PublicStoreItem | null;
  currentStore: BasketStoreInfo;
  isServiceable: boolean;
  compatibleItems: Array<{
    item: BasketItem;
    newSellerProductId: string;
    newUnitPrice: number;
    newMrp: number;
    newAvailableQuantity: number;
    priceChanged: boolean;
    quantityAdjusted: number;
  }>;
  unavailableItems: Array<{
    item: BasketItem;
    reason: string;
  }>;
  priceChangesCount: number;
  unavailableCount: number;
}

// ==============================================================================
// PHASE 12 — ORDER MANAGEMENT & COMPLAINTS
// ==============================================================================

export type OrderStatusType =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'FAILED'
  | 'RETURN_REQUESTED'
  | 'REFUNDED';

export type PaymentMethodType = 'RAZORPAY' | 'COD';
export type PaymentStatusType =
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type RefundStatusType =
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED';

export type DeliveryStatusType =
  | 'PENDING'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export type OrderComplaintCategoryType =
  | 'MISSING_ITEM'
  | 'WRONG_ITEM'
  | 'DAMAGED_ITEM'
  | 'SPOILED_PERISHABLE'
  | 'INCORRECT_QUANTITY'
  | 'OTHER';

export type OrderComplaintStatusType =
  'OPEN' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';

export interface OrderItemSnapshotDto {
  id: string;
  sellerProductId: string;
  productIdSnapshot: string | null;
  variantIdSnapshot: string | null;
  productNameSnapshot: string;
  brandSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  imageUrlSnapshot: string | null;
  unitPrice: number;
  mrp: number | null;
  discountAmount: number;
  taxAmount: number;
  quantity: number;
  totalAmount: number;
}

export interface OrderStatusHistoryItem {
  id: string;
  previousStatus: OrderStatusType;
  newStatus: OrderStatusType;
  note: string | null;
  changedBy: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface OrderComplaintItem {
  id: string;
  orderId: string;
  orderNumber?: string;
  orderItemId: string | null;
  customerId: string;
  category: OrderComplaintCategoryType;
  status: OrderComplaintStatusType;
  description: string;
  evidenceUrls: string[];
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface OrderSummaryItem {
  id: string;
  orderNumber: string;
  sellerId: string;
  storeName: string;
  storeSlug?: string | null;
  customerName?: string | null;
  status: OrderStatusType;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  deliveryStatus: DeliveryStatusType;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
  totalUnits: number;
  itemsPreview: Array<{
    productName: string;
    variantName: string | null;
    quantity: number;
    imageUrl: string | null;
  }>;
  createdAt: string;
  confirmedAt: string | null;
  packedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export interface OrderDetailResponse extends OrderSummaryItem {
  customerId: string;
  checkoutSessionId: string | null;
  couponCode: string | null;
  notes: string | null;
  cancellationReason: string | null;
  rejectionReason: string | null;
  addressSnapshot: CheckoutAddressSnapshot;
  items: OrderItemSnapshotDto[];
  statusHistory: OrderStatusHistoryItem[];
  complaints: OrderComplaintItem[];
  canCancel: boolean;
  canComplain: boolean;
}

export interface PaginatedOrdersResponse {
  items: OrderSummaryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts?: Record<string, number>;
}

export interface OrderTrackingMilestone {
  status: OrderStatusType;
  label: string;
  completed: boolean;
  timestamp: string | null;
}

export interface OrderTrackingResponse {
  orderId: string;
  orderNumber: string;
  status: OrderStatusType;
  deliveryStatus: DeliveryStatusType;
  storeName: string;
  milestones: OrderTrackingMilestone[];
  history: OrderStatusHistoryItem[];
}

// ============================================================================
// Phase 13: Payment Gateway (Razorpay) & Refunds Types
// ============================================================================

export interface RazorpayCheckoutConfig {
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  name: string;
  description: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
}

export interface InitiatePaymentResponse {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  paymentMethod: PaymentMethodType;
  status: PaymentStatusType;
  amount: number;
  amountPaise: number;
  currency: string;
  attemptNumber: number;
  checkout: RazorpayCheckoutConfig;
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatusType;
  orderPaymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
  provider: string;
  method: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  amount: number;
  capturedAmount: number;
  refundedAmount: number;
  currency: string;
  status: PaymentStatusType;
  gatewayStatus: string | null;
  failureCode: string | null;
  failureReason: string | null;
  attemptNumber: number;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStatusHistoryItem {
  id: string;
  previousStatus: PaymentStatusType;
  newStatus: PaymentStatusType;
  source: string;
  providerEventId: string | null;
  providerPaymentId: string | null;
  note: string | null;
  createdAt: string;
}

export interface RefundSummaryItem {
  id: string;
  orderId: string;
  orderNumber?: string;
  paymentId: string;
  refundNumber: string;
  amount: number;
  reason: string;
  status: RefundStatusType;
  providerRefundId: string | null;
  speedRequested: string | null;
  speedProcessed: string | null;
  gatewayStatus: string | null;
  failureReason: string | null;
  requestedBy: string;
  approvedBy: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface AdminPaymentDetailResponse extends PaymentStatusResponse {
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  sellerId: string;
  storeName: string | null;
  statusHistory: PaymentStatusHistoryItem[];
  refunds: RefundSummaryItem[];
}

export interface PaginatedPaymentsResponse {
  items: Array<
    PaymentStatusResponse & {
      customerName?: string | null;
      storeName?: string | null;
    }
  >;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedRefundsResponse {
  items: RefundSummaryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentReconciliationResponse {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  previousStatus: PaymentStatusType;
  newStatus: PaymentStatusType;
  gatewayStatus: string | null;
  expectedAmount: number;
  gatewayAmount: number | null;
  discrepancyDetected: boolean;
  discrepancyReason: string | null;
  resolutionAction: string | null;
  reconciledAt: string;
}
