import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EmailService } from '../email/email.service';
import {
  AdminRejectApplicationDto,
  AdminReviewDocumentDto,
  AdminSuspendSellerDto,
  QuerySellersDto,
} from './dto';
import { Prisma, SellerStatus, UserRoleType, VerificationStatus } from '@prisma/client';

const FOOD_CATEGORIES = new Set([
  'GROCERY',
  'BAKERY',
  'MEAT_DAIRY',
  'FRUITS_VEGETABLES',
  'BEVERAGES',
  'FOOD',
]);

@Injectable()
export class AdminSellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * List all seller applications with filtering, search, and pagination.
   */
  async listApplications(query: QuerySellersDto) {
    const { search, status, category, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SellerWhereInput = {};

    if (status) {
      where.status = status as SellerStatus;
    }

    if (category) {
      where.storeCategory = { equals: category, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { storeDisplayName: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, sellers] = await Promise.all([
      this.prisma.seller.count({ where }),
      this.prisma.seller.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true } },
          profile: true,
          documents: { select: { id: true, documentType: true, verificationStatus: true } },
        },
      }),
    ]);

    const items = sellers.map((s) => {
      const verifiedDocs = s.documents.filter(
        (d) => d.verificationStatus === VerificationStatus.VERIFIED,
      ).length;

      return {
        id: s.id,
        businessName: s.businessName,
        storeDisplayName: s.storeDisplayName || s.businessName,
        storeCategory: s.storeCategory || 'GROCERY',
        ownerName: s.owner.name,
        ownerEmail: s.owner.email,
        ownerPhone: s.businessPhone || s.owner.phone,
        status: s.status,
        currentStep: s.currentStep,
        isSubmitted: s.isSubmitted,
        submittedAt: s.submittedAt,
        approvalDate: s.approvalDate,
        totalDocuments: s.documents.length,
        verifiedDocuments: verifiedDocs,
        createdAt: s.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Get detailed application record for admin inspection.
   */
  async getApplicationDetail(sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        owner: true,
        profile: true,
        documents: {
          include: {
            reviews: {
              include: { reviewer: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!seller) {
      throw new NotFoundException(`Seller application with ID ${sellerId} not found`);
    }

    const documents = seller.documents.map((doc) => ({
      ...doc,
      signedPreviewUrl: doc.cloudinaryPublicId
        ? this.cloudinary.generateSignedUrl(doc.cloudinaryPublicId, {
            resourceType: doc.mimeType === 'application/pdf' ? 'raw' : 'image',
            expiresInSeconds: 600, // 10 minutes for admin review
          })
        : doc.documentUrl,
    }));

    return {
      id: seller.id,
      ownerUserId: seller.ownerUserId,
      businessName: seller.businessName,
      slug: seller.slug,
      businessEmail: seller.businessEmail,
      businessPhone: seller.businessPhone,
      status: seller.status,
      currentStep: seller.currentStep,
      isSubmitted: seller.isSubmitted,
      submittedAt: seller.submittedAt,
      approvalDate: seller.approvalDate,
      rejectionReason: seller.rejectionReason,
      suspensionReason: seller.suspensionReason,

      owner: {
        id: seller.owner.id,
        name: seller.owner.name,
        email: seller.owner.email,
        phone: seller.owner.phone,
        emailVerifiedAt: seller.owner.emailVerifiedAt,
      },

      store: {
        storeDisplayName: seller.storeDisplayName || seller.businessName,
        storeCategory: seller.storeCategory,
        addressLine1: seller.profile?.addressLine1,
        addressLine2: seller.profile?.addressLine2,
        landmark: seller.profile?.landmark,
        city: seller.profile?.city,
        state: seller.profile?.state,
        postalCode: seller.profile?.postalCode,
        country: seller.profile?.country,
        latitude: seller.profile?.latitude ? Number(seller.profile.latitude) : null,
        longitude: seller.profile?.longitude ? Number(seller.profile.longitude) : null,
        serviceRadiusKm: seller.profile?.serviceRadiusKm
          ? Number(seller.profile.serviceRadiusKm)
          : 5,
        openingTime: seller.profile?.openingTime,
        closingTime: seller.profile?.closingTime,
        weeklyOffDays: seller.profile?.weeklyOffDays,
        storefrontPhotoUrl: seller.profile?.storefrontPhotoUrl,
        storeInteriorPhotoUrl: seller.profile?.storeInteriorPhotoUrl,
      },

      business: {
        legalBusinessName: seller.legalBusinessName,
        businessEntityType: seller.businessEntityType,
        pan: seller.pan,
        gstin: seller.gstin,
        fssaiNumber: seller.fssaiNumber,
        fssaiExpiryDate: seller.fssaiExpiryDate,
        shopEstablishmentNumber: seller.shopEstablishmentNumber,
      },

      bank: {
        accountHolderName: seller.bankAccountHolderName,
        accountNumberMasked: seller.bankAccountNumberMasked,
        ifscCode: seller.bankIfscCode,
        bankName: seller.bankName,
        accountType: seller.bankAccountType,
        upiId: seller.upiId,
      },

      documents,
      statusHistory: seller.statusHistory,
      createdAt: seller.createdAt,
      updatedAt: seller.updatedAt,
    };
  }

  /**
   * Review an individual KYC document (mark verified, reject, or request resubmission).
   */
  async reviewDocument(
    adminUserId: string,
    sellerId: string,
    documentId: string,
    dto: AdminReviewDocumentDto,
  ) {
    const document = await this.prisma.sellerDocument.findFirst({
      where: { id: documentId, sellerId },
    });

    if (!document) {
      throw new NotFoundException('Document not found for this seller application');
    }

    if (dto.status === 'REJECTED' && !dto.notes?.trim()) {
      throw new BadRequestException(
        'A specific reason or note is required when rejecting a document',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.sellerDocument.update({
        where: { id: document.id },
        data: {
          verificationStatus: dto.status as VerificationStatus,
          verifiedBy: adminUserId,
          verifiedAt: new Date(),
          rejectionReason: dto.status === 'REJECTED' ? dto.notes : null,
        },
      });

      await tx.sellerDocumentReview.create({
        data: {
          documentId: document.id,
          reviewerId: adminUserId,
          status: dto.status as VerificationStatus,
          notes: dto.notes,
        },
      });

      return doc;
    });

    return updated;
  }

  /**
   * Get secure document preview for authorized administrators.
   */
  async getDocumentPreview(adminUserId: string, sellerId: string, documentId: string) {
    const document = await this.prisma.sellerDocument.findFirst({
      where: { id: documentId, sellerId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const isPdf =
      document.mimeType === 'application/pdf' ||
      document.originalFilename?.toLowerCase().endsWith('.pdf');

    const previewUrl = document.cloudinaryPublicId
      ? this.cloudinary.generateSignedUrl(document.cloudinaryPublicId, {
          resourceType: isPdf ? 'raw' : 'image',
          expiresInSeconds: 600,
        })
      : document.documentUrl;

    return {
      documentId: document.id,
      documentType: document.documentType,
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      previewUrl,
      isPdf,
    };
  }

  /**
   * Approve seller application and activate store.
   * Enforces all verification invariants and assigns SELLER role to owner user.
   */
  async approveSeller(adminUserId: string, sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { documents: true, owner: true, profile: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (
      seller.status !== SellerStatus.PENDING_VERIFICATION &&
      seller.status !== SellerStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Cannot approve seller in '${seller.status}' status. Must be PENDING_VERIFICATION.`,
      );
    }

    // Verify mandatory documents are verified
    const mandatoryDocTypes = ['PAN_CARD', 'BANK_PROOF', 'ADDRESS_PROOF'];
    const isFoodCategory = FOOD_CATEGORIES.has((seller.storeCategory || '').toUpperCase());
    if (isFoodCategory) mandatoryDocTypes.push('FSSAI_CERTIFICATE');
    if (seller.gstin) mandatoryDocTypes.push('GST_CERTIFICATE');

    const unverifiedDocs = mandatoryDocTypes.filter((type) => {
      const doc = seller.documents.find((d) => d.documentType === type);
      return !doc || doc.verificationStatus !== VerificationStatus.VERIFIED;
    });

    if (unverifiedDocs.length > 0) {
      throw new BadRequestException({
        message:
          'Cannot approve seller: All mandatory documents must be reviewed and verified first',
        unverifiedDocuments: unverifiedDocs,
      });
    }

    const previousStatus = seller.status;

    // Execute approval inside transaction: update status, grant SELLER role, add history
    const approvedSeller = await this.prisma.$transaction(async (tx) => {
      // 1. Update seller
      const s = await tx.seller.update({
        where: { id: seller.id },
        data: {
          status: SellerStatus.APPROVED_ACTIVE,
          approvalDate: new Date(),
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          rejectionReason: null,
          suspensionReason: null,
        },
      });

      // 2. Grant SELLER role to owner user if not present
      const sellerRole = await tx.role.findFirst({
        where: { name: UserRoleType.SELLER },
      });

      if (sellerRole) {
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: seller.ownerUserId,
              roleId: sellerRole.id,
            },
          },
          update: {},
          create: {
            userId: seller.ownerUserId,
            roleId: sellerRole.id,
            assignedBy: adminUserId,
          },
        });
      }

      // 3. Record status history
      await tx.sellerStatusHistory.create({
        data: {
          sellerId: seller.id,
          fromStatus: previousStatus,
          toStatus: SellerStatus.APPROVED_ACTIVE,
          reason: 'Application approved by administrator',
          changedBy: adminUserId,
        },
      });

      return s;
    });

    // Send email notification
    if (seller.owner.email) {
      await this.emailService.sendSellerApprovedEmail(
        seller.owner.email,
        seller.owner.name,
        seller.storeDisplayName || seller.businessName,
      );
    }

    return {
      success: true,
      message: 'Seller successfully approved and store activated',
      seller: approvedSeller,
    };
  }

  /**
   * Reject seller application with specific reason.
   */
  async rejectSeller(adminUserId: string, sellerId: string, dto: AdminRejectApplicationDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { owner: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (
      seller.status !== SellerStatus.PENDING_VERIFICATION &&
      seller.status !== SellerStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(`Cannot reject seller in '${seller.status}' status.`);
    }

    const previousStatus = seller.status;

    const rejected = await this.prisma.$transaction(async (tx) => {
      const s = await tx.seller.update({
        where: { id: seller.id },
        data: {
          status: SellerStatus.REJECTED,
          rejectionReason: dto.reason,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      });

      await tx.sellerStatusHistory.create({
        data: {
          sellerId: seller.id,
          fromStatus: previousStatus,
          toStatus: SellerStatus.REJECTED,
          reason: dto.reason,
          changedBy: adminUserId,
        },
      });

      return s;
    });

    if (seller.owner.email) {
      await this.emailService.sendSellerRejectedEmail(
        seller.owner.email,
        seller.owner.name,
        seller.storeDisplayName || seller.businessName,
        dto.reason,
      );
    }

    return {
      success: true,
      message: 'Seller application rejected with feedback for correction',
      seller: rejected,
    };
  }

  /**
   * Suspend an active seller.
   */
  async suspendSeller(adminUserId: string, sellerId: string, dto: AdminSuspendSellerDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { owner: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (seller.status !== SellerStatus.APPROVED_ACTIVE && seller.status !== SellerStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot suspend seller in '${seller.status}' status. Only active sellers can be suspended.`,
      );
    }

    const previousStatus = seller.status;

    const suspended = await this.prisma.$transaction(async (tx) => {
      const s = await tx.seller.update({
        where: { id: seller.id },
        data: {
          status: SellerStatus.SUSPENDED,
          suspensionReason: dto.reason,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      });

      await tx.sellerStatusHistory.create({
        data: {
          sellerId: seller.id,
          fromStatus: previousStatus,
          toStatus: SellerStatus.SUSPENDED,
          reason: dto.reason,
          changedBy: adminUserId,
        },
      });

      return s;
    });

    if (seller.owner.email) {
      await this.emailService.sendSellerSuspendedEmail(
        seller.owner.email,
        seller.owner.name,
        seller.storeDisplayName || seller.businessName,
        dto.reason,
      );
    }

    return {
      success: true,
      message: 'Seller successfully suspended',
      seller: suspended,
    };
  }

  /**
   * Reactivate a suspended seller.
   */
  async reactivateSeller(adminUserId: string, sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { owner: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (seller.status !== SellerStatus.SUSPENDED) {
      throw new BadRequestException('Only suspended sellers can be reactivated');
    }

    const previousStatus = seller.status;

    const reactivated = await this.prisma.$transaction(async (tx) => {
      const s = await tx.seller.update({
        where: { id: seller.id },
        data: {
          status: SellerStatus.APPROVED_ACTIVE,
          suspensionReason: null,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      });

      await tx.sellerStatusHistory.create({
        data: {
          sellerId: seller.id,
          fromStatus: previousStatus,
          toStatus: SellerStatus.APPROVED_ACTIVE,
          reason: 'Seller reactivated by administrator',
          changedBy: adminUserId,
        },
      });

      return s;
    });

    if (seller.owner.email) {
      await this.emailService.sendSellerReactivatedEmail(
        seller.owner.email,
        seller.owner.name,
        seller.storeDisplayName || seller.businessName,
      );
    }

    return {
      success: true,
      message: 'Seller successfully reactivated',
      seller: reactivated,
    };
  }

  /**
   * Get status history audit timeline.
   */
  async getStatusHistory(sellerId: string) {
    const history = await this.prisma.sellerStatusHistory.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
    return history;
  }
}
