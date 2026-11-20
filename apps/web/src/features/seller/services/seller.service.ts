import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/endpoints';
import {
  SellerApplicationData,
  SellerDocumentInfo,
  UpdateSellerApplicationRequest,
} from '@marvels-basket/shared';

export interface SellerStatusOverview {
  sellerId: string;
  status: string;
  isSubmitted: boolean;
  submittedAt: string | null;
  approvalDate: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  currentStep: number;
  totalDocuments: number;
  verifiedDocuments: number;
  recentHistory: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    reason: string | null;
    createdAt: string;
  }>;
}

export class SellerService {
  /**
   * Get or initiate seller onboarding draft.
   */
  static async getOrCreateApplication(data?: {
    storeDisplayName?: string;
    storeCategory?: string;
  }): Promise<SellerApplicationData> {
    const res = await apiClient.post<SellerApplicationData>(
      ENDPOINTS.SELLERS.APPLICATION,
      data || {},
    );
    return res.data!;
  }

  /**
   * Retrieve current user's seller application.
   */
  static async getMyApplication(): Promise<SellerApplicationData> {
    const res = await apiClient.get<SellerApplicationData>(ENDPOINTS.SELLERS.MY_APPLICATION);
    return res.data!;
  }

  /**
   * Save or update draft application information.
   */
  static async updateMyApplication(
    data: UpdateSellerApplicationRequest,
  ): Promise<SellerApplicationData> {
    const res = await apiClient.patch<SellerApplicationData>(
      ENDPOINTS.SELLERS.MY_APPLICATION,
      data,
    );
    return res.data!;
  }

  /**
   * Upload a KYC verification document.
   */
  static async uploadDocument(
    file: File,
    documentType: string,
    expiryDate?: string,
  ): Promise<SellerDocumentInfo & { signedPreviewUrl?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (expiryDate) {
      formData.append('expiryDate', expiryDate);
    }

    const res = await apiClient.post<SellerDocumentInfo & { signedPreviewUrl?: string }>(
      ENDPOINTS.SELLERS.DOCUMENTS,
      formData,
    );
    return res.data!;
  }

  /**
   * List uploaded documents for the seller.
   */
  static async listDocuments(): Promise<Array<SellerDocumentInfo & { signedPreviewUrl?: string }>> {
    const res = await apiClient.get<Array<SellerDocumentInfo & { signedPreviewUrl?: string }>>(
      ENDPOINTS.SELLERS.DOCUMENTS,
    );
    return res.data || [];
  }

  /**
   * Remove an uploaded document (draft/rejected).
   */
  static async deleteDocument(documentId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.SELLERS.DOCUMENT(documentId));
  }

  /**
   * Submit seller application for verification.
   */
  static async submitApplication(): Promise<SellerApplicationData> {
    const res = await apiClient.post<SellerApplicationData>(
      ENDPOINTS.SELLERS.SUBMIT_APPLICATION,
      {},
    );
    return res.data!;
  }

  /**
   * Retrieve application review and verification status overview.
   */
  static async getMyStatus(): Promise<SellerStatusOverview> {
    const res = await apiClient.get<SellerStatusOverview>(ENDPOINTS.SELLERS.STATUS);
    return res.data!;
  }

  /**
   * Get operational seller profile.
   */
  static async getMyProfile(): Promise<Record<string, unknown>> {
    const res = await apiClient.get<Record<string, unknown>>(ENDPOINTS.SELLERS.PROFILE);
    return res.data!;
  }

  /**
   * Update operational seller profile.
   */
  static async updateMyProfile(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await apiClient.patch<Record<string, unknown>>(ENDPOINTS.SELLERS.PROFILE, data);
    return res.data!;
  }

  /**
   * Get operational seller store details.
   */
  static async getMyStore(): Promise<Record<string, unknown>> {
    const res = await apiClient.get<Record<string, unknown>>(ENDPOINTS.SELLERS.STORE);
    return res.data!;
  }

  /**
   * Update operational seller store details.
   */
  static async updateMyStore(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await apiClient.patch<Record<string, unknown>>(ENDPOINTS.SELLERS.STORE, data);
    return res.data!;
  }
}
