import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/endpoints';

export interface AdminSellerListItem {
  id: string;
  businessName: string;
  storeDisplayName: string;
  storeCategory: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  status: string;
  currentStep: number;
  isSubmitted: boolean;
  submittedAt: string | null;
  approvalDate: string | null;
  totalDocuments: number;
  verifiedDocuments: number;
  createdAt: string;
}

export interface AdminSellerListResponse {
  items: AdminSellerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface AdminSellerDetail {
  id: string;
  ownerUserId: string;
  businessName: string;
  slug: string;
  businessEmail: string;
  businessPhone: string;
  status: string;
  currentStep: number;
  isSubmitted: boolean;
  submittedAt: string | null;
  approvalDate: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;

  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerifiedAt: string | null;
  };

  store: {
    storeDisplayName: string;
    storeCategory: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    serviceRadiusKm: number;
    openingTime: string;
    closingTime: string;
    weeklyOffDays: string;
    storefrontPhotoUrl?: string;
    storeInteriorPhotoUrl?: string;
  };

  business: {
    legalBusinessName: string;
    businessEntityType: string;
    pan: string;
    gstin?: string;
    fssaiNumber?: string;
    fssaiExpiryDate?: string;
    shopEstablishmentNumber?: string;
  };

  bank: {
    accountHolderName: string;
    accountNumberMasked: string;
    ifscCode: string;
    bankName: string;
    accountType: string;
    upiId?: string;
  };

  documents: Array<{
    id: string;
    documentType: string;
    documentUrl: string;
    signedPreviewUrl?: string;
    originalFilename?: string;
    mimeType?: string;
    fileSize?: number;
    verificationStatus: string;
    rejectionReason?: string;
    expiryDate?: string;
    reviews?: Array<{
      id: string;
      status: string;
      notes: string | null;
      createdAt: string;
      reviewer: { name: string; email: string };
    }>;
  }>;

  statusHistory: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    reason: string | null;
    createdAt: string;
  }>;

  createdAt: string;
  updatedAt: string;
}

export class AdminSellerService {
  /**
   * List all seller applications with filtering and pagination.
   */
  static async listApplications(params: {
    search?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminSellerListResponse> {
    const res = await apiClient.get<AdminSellerListResponse>(ENDPOINTS.ADMIN_SELLERS.LIST, {
      params,
    });
    return res.data!;
  }

  /**
   * Get detailed application information for inspection.
   */
  static async getApplicationDetail(sellerId: string): Promise<AdminSellerDetail> {
    const res = await apiClient.get<AdminSellerDetail>(ENDPOINTS.ADMIN_SELLERS.DETAIL(sellerId));
    return res.data!;
  }

  /**
   * Review an individual KYC document (VERIFIED or REJECTED).
   */
  static async reviewDocument(
    sellerId: string,
    documentId: string,
    status: 'VERIFIED' | 'REJECTED' | 'NEEDS_RESUBMISSION',
    notes?: string,
  ): Promise<Record<string, unknown>> {
    const res = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.ADMIN_SELLERS.REVIEW_DOCUMENT(sellerId, documentId),
      { status, notes },
    );
    return res.data!;
  }

  /**
   * Generate secure document preview URL for in-app viewing.
   */
  static async getDocumentPreview(
    sellerId: string,
    documentId: string,
  ): Promise<{ previewUrl: string; isPdf: boolean; mimeType: string }> {
    const res = await apiClient.get<{
      previewUrl: string;
      isPdf: boolean;
      mimeType: string;
    }>(ENDPOINTS.ADMIN_SELLERS.DOCUMENT_PREVIEW(sellerId, documentId));
    return res.data!;
  }

  /**
   * Approve seller application and activate store.
   */
  static async approveSeller(sellerId: string): Promise<Record<string, unknown>> {
    const res = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.ADMIN_SELLERS.APPROVE(sellerId),
      {},
    );
    return res.data!;
  }

  /**
   * Reject seller application with specific reason.
   */
  static async rejectSeller(sellerId: string, reason: string): Promise<Record<string, unknown>> {
    const res = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.ADMIN_SELLERS.REJECT(sellerId),
      {
        reason,
      },
    );
    return res.data!;
  }

  /**
   * Suspend an active seller.
   */
  static async suspendSeller(sellerId: string, reason: string): Promise<Record<string, unknown>> {
    const res = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.ADMIN_SELLERS.SUSPEND(sellerId),
      {
        reason,
      },
    );
    return res.data!;
  }

  /**
   * Reactivate a suspended seller.
   */
  static async reactivateSeller(sellerId: string): Promise<Record<string, unknown>> {
    const res = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.ADMIN_SELLERS.REACTIVATE(sellerId),
      {},
    );
    return res.data!;
  }
}
