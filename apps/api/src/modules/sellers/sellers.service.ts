import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EmailService } from '../email/email.service';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import {
  CreateSellerApplicationDto,
  UpdateSellerApplicationDto,
  UploadSellerDocumentDto,
  UpdateSellerProfileDto,
  UpdateSellerStoreDto,
} from './dto';
import { SellerStatus, VerificationStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const FOOD_CATEGORIES = new Set([
  'GROCERY',
  'BAKERY',
  'MEAT_DAIRY',
  'FRUITS_VEGETABLES',
  'BEVERAGES',
  'FOOD',
]);

@Injectable()
export class SellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Helper to normalize a slug from name.
   */
  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base || 'store'}-${suffix}`;
  }

  /**
   * Start or retrieve existing seller application draft for authenticated user.
   */
  async getOrCreateApplication(userId: string, dto?: CreateSellerApplicationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller: { include: { profile: true, documents: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.seller) {
      return this.formatSellerApplication(user.seller, user);
    }

    const businessName = dto?.storeDisplayName || `${user.name}'s Store`;
    const slug = this.generateSlug(businessName);

    const seller = await this.prisma.seller.create({
      data: {
        ownerUserId: user.id,
        businessName,
        storeDisplayName: dto?.storeDisplayName || businessName,
        storeCategory: dto?.storeCategory || 'GROCERY',
        slug,
        businessEmail: user.email || '',
        businessPhone: user.phone || '',
        status: SellerStatus.DRAFT,
        currentStep: 1,
        profile: {
          create: {
            addressLine1: 'Pending store address',
            city: 'Pending',
            state: 'Pending',
            postalCode: '000000',
            serviceRadiusKm: new Decimal(5.0),
          },
        },
      },
      include: { profile: true, documents: true },
    });

    return this.formatSellerApplication(seller, user);
  }

  /**
   * Retrieve current user's seller application.
   */
  async getApplication(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
      include: {
        profile: true,
        documents: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        owner: true,
      },
    });

    if (!seller) {
      throw new NotFoundException('No seller application found for your account');
    }

    return this.formatSellerApplication(seller, seller.owner);
  }

  /**
   * Save or update draft application information.
   * Only allowed when status is DRAFT or REJECTED.
   */
  async updateApplication(userId: string, dto: UpdateSellerApplicationDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
      include: { profile: true, documents: true, owner: true },
    });

    if (!seller) {
      throw new NotFoundException('No seller application found');
    }

    if (seller.status !== SellerStatus.DRAFT && seller.status !== SellerStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot update application in '${seller.status}' status. Submitted applications are locked.`,
      );
    }

    // Step 1: Owner Profile Updates
    if (dto.ownerName) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: dto.ownerName },
      });
    }

    // Step 4: Bank verification checks
    let bankAccountNumberEncrypted = seller.bankAccountNumberEncrypted;
    let bankAccountNumberMasked = seller.bankAccountNumberMasked;

    if (dto.bankAccountNumber) {
      if (!dto.confirmBankAccountNumber) {
        throw new BadRequestException(
          'Please confirm your bank account number by entering it twice',
        );
      }
      if (dto.bankAccountNumber !== dto.confirmBankAccountNumber) {
        throw new BadRequestException(
          'Bank account number and confirm bank account number do not match',
        );
      }
      bankAccountNumberEncrypted = EncryptionUtil.encrypt(dto.bankAccountNumber);
      bankAccountNumberMasked = EncryptionUtil.maskAccountNumber(dto.bankAccountNumber);
    }

    // Auto-transition from REJECTED back to DRAFT when seller begins correcting issues
    let newStatus = seller.status;
    if (seller.status === SellerStatus.REJECTED) {
      newStatus = SellerStatus.DRAFT;
      await this.prisma.sellerStatusHistory.create({
        data: {
          sellerId: seller.id,
          fromStatus: SellerStatus.REJECTED,
          toStatus: SellerStatus.DRAFT,
          reason: 'Seller initiated draft revisions after rejection',
          changedBy: userId,
        },
      });
    }

    // Update Seller Entity
    await this.prisma.seller.update({
      where: { id: seller.id },
      data: {
        status: newStatus,
        currentStep: dto.currentStep ?? seller.currentStep,
        businessPhone: dto.businessPhone ?? seller.businessPhone,
        storeDisplayName: dto.storeDisplayName ?? seller.storeDisplayName,
        storeCategory: dto.storeCategory ?? seller.storeCategory,
        legalBusinessName: dto.legalBusinessName ?? seller.legalBusinessName,
        businessEntityType: dto.businessEntityType ?? seller.businessEntityType,
        pan: dto.pan ? dto.pan.toUpperCase() : seller.pan,
        gstin: dto.gstin ? dto.gstin.toUpperCase() : seller.gstin,
        fssaiNumber: dto.fssaiNumber ?? seller.fssaiNumber,
        fssaiExpiryDate: dto.fssaiExpiryDate
          ? new Date(dto.fssaiExpiryDate)
          : seller.fssaiExpiryDate,
        shopEstablishmentNumber: dto.shopEstablishmentNumber ?? seller.shopEstablishmentNumber,
        bankAccountHolderName: dto.bankAccountHolderName ?? seller.bankAccountHolderName,
        bankAccountNumberEncrypted,
        bankAccountNumberMasked,
        bankIfscCode: dto.bankIfscCode ? dto.bankIfscCode.toUpperCase() : seller.bankIfscCode,
        bankName: dto.bankName ?? seller.bankName,
        bankAccountType: dto.bankAccountType ?? seller.bankAccountType,
        upiId: dto.upiId ?? seller.upiId,
      },
      include: { profile: true, documents: true },
    });

    // Update Seller Profile Entity (Store Address, Radius, Hours, Photos)
    await this.prisma.sellerProfile.upsert({
      where: { sellerId: seller.id },
      create: {
        sellerId: seller.id,
        addressLine1: dto.addressLine1 || 'Pending address',
        addressLine2: dto.addressLine2,
        landmark: dto.landmark,
        city: dto.city || 'Pending',
        state: dto.state || 'Pending',
        postalCode: dto.postalCode || '000000',
        country: dto.country || 'India',
        latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : null,
        longitude: dto.longitude !== undefined ? new Decimal(dto.longitude) : null,
        serviceRadiusKm:
          dto.serviceRadiusKm !== undefined ? new Decimal(dto.serviceRadiusKm) : new Decimal(5.0),
        openingTime: dto.openingTime,
        closingTime: dto.closingTime,
        weeklyOffDays: dto.weeklyOffDays,
        storefrontPhotoUrl: dto.storefrontPhotoUrl,
        storeInteriorPhotoUrl: dto.storeInteriorPhotoUrl,
      },
      update: {
        addressLine1: dto.addressLine1 ?? seller.profile?.addressLine1,
        addressLine2: dto.addressLine2 ?? seller.profile?.addressLine2,
        landmark: dto.landmark ?? seller.profile?.landmark,
        city: dto.city ?? seller.profile?.city,
        state: dto.state ?? seller.profile?.state,
        postalCode: dto.postalCode ?? seller.profile?.postalCode,
        country: dto.country ?? seller.profile?.country,
        latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : seller.profile?.latitude,
        longitude:
          dto.longitude !== undefined ? new Decimal(dto.longitude) : seller.profile?.longitude,
        serviceRadiusKm:
          dto.serviceRadiusKm !== undefined
            ? new Decimal(dto.serviceRadiusKm)
            : seller.profile?.serviceRadiusKm,
        openingTime: dto.openingTime ?? seller.profile?.openingTime,
        closingTime: dto.closingTime ?? seller.profile?.closingTime,
        weeklyOffDays: dto.weeklyOffDays ?? seller.profile?.weeklyOffDays,
        storefrontPhotoUrl: dto.storefrontPhotoUrl ?? seller.profile?.storefrontPhotoUrl,
        storeInteriorPhotoUrl: dto.storeInteriorPhotoUrl ?? seller.profile?.storeInteriorPhotoUrl,
      },
    });

    const refreshed = await this.prisma.seller.findUnique({
      where: { id: seller.id },
      include: { profile: true, documents: true, owner: true },
    });

    return this.formatSellerApplication(refreshed!, refreshed!.owner);
  }

  /**
   * Upload a KYC document.
   */
  async uploadDocument(userId: string, file: Express.Multer.File, dto: UploadSellerDocumentDto) {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller application not found');
    }

    if (seller.status !== SellerStatus.DRAFT && seller.status !== SellerStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot upload documents while application is in '${seller.status}' status.`,
      );
    }

    // Validate MIME type
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type '${file.mimetype}'. Allowed: PDF, JPG, PNG, WebP.`,
      );
    }

    // Max 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds the 10 MB limit');
    }

    // Folder routing based on document category
    const folderMap: Record<string, string> = {
      PAN_CARD: 'marvels-basket/sellers/kyc/pan',
      BANK_PROOF: 'marvels-basket/sellers/kyc/bank-documents',
      ADDRESS_PROOF: 'marvels-basket/sellers/kyc/address-proof',
      FSSAI_CERTIFICATE: 'marvels-basket/sellers/kyc/fssai',
      GST_CERTIFICATE: 'marvels-basket/sellers/kyc/gst',
      STORE_FRONT_PHOTO: 'marvels-basket/sellers/store-images',
      OTHER: 'marvels-basket/sellers/kyc/other',
    };

    const targetFolder = folderMap[dto.documentType] || 'marvels-basket/sellers/kyc/general';

    // Upload via Cloudinary service
    const uploadResult = await this.cloudinary.uploadPrivateDocument(file, {
      folder: targetFolder,
      tags: ['seller-kyc', seller.id, dto.documentType],
    });

    // Check if a document of this type already exists
    const existingDoc = await this.prisma.sellerDocument.findFirst({
      where: { sellerId: seller.id, documentType: dto.documentType },
    });

    let documentRecord;
    if (existingDoc) {
      // If previous asset existed in cloudinary, trigger cleanup
      if (existingDoc.cloudinaryPublicId) {
        this.cloudinary.deleteResource(
          existingDoc.cloudinaryPublicId,
          uploadResult.resourceType === 'raw' ? 'raw' : 'image',
        );
      }

      documentRecord = await this.prisma.sellerDocument.update({
        where: { id: existingDoc.id },
        data: {
          documentUrl: uploadResult.secureUrl,
          cloudinaryPublicId: uploadResult.publicId,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          verificationStatus: VerificationStatus.PENDING,
          rejectionReason: null,
          verifiedBy: null,
          verifiedAt: null,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        },
      });
    } else {
      documentRecord = await this.prisma.sellerDocument.create({
        data: {
          sellerId: seller.id,
          documentType: dto.documentType,
          documentUrl: uploadResult.secureUrl,
          cloudinaryPublicId: uploadResult.publicId,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          verificationStatus: VerificationStatus.PENDING,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        },
      });
    }

    return {
      ...documentRecord,
      signedPreviewUrl: this.cloudinary.generateSignedUrl(uploadResult.publicId, {
        resourceType: uploadResult.resourceType as 'image' | 'raw',
      }),
    };
  }

  /**
   * List all uploaded documents for the seller.
   */
  async listDocuments(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
      include: { documents: { orderBy: { createdAt: 'desc' } } },
    });

    if (!seller) {
      throw new NotFoundException('Seller application not found');
    }

    return seller.documents.map((doc) => ({
      ...doc,
      signedPreviewUrl: doc.cloudinaryPublicId
        ? this.cloudinary.generateSignedUrl(doc.cloudinaryPublicId, {
            resourceType: doc.mimeType === 'application/pdf' ? 'raw' : 'image',
          })
        : doc.documentUrl,
    }));
  }

  /**
   * Delete an uploaded document (only allowed in DRAFT or REJECTED status).
   */
  async deleteDocument(userId: string, documentId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller application not found');
    }

    if (seller.status !== SellerStatus.DRAFT && seller.status !== SellerStatus.REJECTED) {
      throw new BadRequestException('Cannot remove documents while application is under review');
    }

    const document = await this.prisma.sellerDocument.findFirst({
      where: { id: documentId, sellerId: seller.id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.cloudinaryPublicId) {
      await this.cloudinary.deleteResource(
        document.cloudinaryPublicId,
        document.mimeType === 'application/pdf' ? 'raw' : 'image',
      );
    }

    await this.prisma.sellerDocument.delete({ where: { id: document.id } });
    return { success: true, message: 'Document removed successfully' };
  }

  /**
   * Submit seller application for admin verification.
   * Performs exhaustive server-side validation of all mandatory fields and documents.
   */
  async submitApplication(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
      include: { profile: true, documents: true, owner: true },
    });

    if (!seller) {
      throw new NotFoundException('No seller application found');
    }

    if (seller.status !== SellerStatus.DRAFT && seller.status !== SellerStatus.REJECTED) {
      throw new BadRequestException(
        `Application is already in '${seller.status}' status. Resubmission not allowed.`,
      );
    }

    const missingFields: string[] = [];

    // Step 1 Validation
    if (!seller.owner.name?.trim()) missingFields.push('Owner Full Name');
    if (!seller.businessPhone?.trim()) missingFields.push('Contact Mobile Number');
    if (!seller.owner.emailVerifiedAt) {
      throw new BadRequestException(
        'Email address must be verified via OTP before submitting application',
      );
    }

    // Step 2 Validation
    if (!seller.storeDisplayName?.trim()) missingFields.push('Store Display Name');
    if (!seller.storeCategory?.trim()) missingFields.push('Store Category');
    if (!seller.profile?.addressLine1 || seller.profile.addressLine1 === 'Pending store address') {
      missingFields.push('Store Address Line 1');
    }
    if (!seller.profile?.city || seller.profile.city === 'Pending')
      missingFields.push('Store City');
    if (!seller.profile?.state || seller.profile.state === 'Pending')
      missingFields.push('Store State');
    if (!seller.profile?.postalCode || seller.profile.postalCode === '000000') {
      missingFields.push('Store PIN Code');
    }
    if (!seller.profile?.openingTime) missingFields.push('Store Opening Time');
    if (!seller.profile?.closingTime) missingFields.push('Store Closing Time');

    // Step 3 Validation
    if (!seller.legalBusinessName?.trim()) missingFields.push('Legal Business Name');
    if (!seller.businessEntityType?.trim()) missingFields.push('Business Entity Type');
    if (!seller.pan?.trim()) missingFields.push('PAN Number');

    // Category-specific regulatory check (FSSAI)
    const categoryUpper = (seller.storeCategory || '').toUpperCase();
    const isFoodCategory = FOOD_CATEGORIES.has(categoryUpper);
    if (isFoodCategory && !seller.fssaiNumber?.trim()) {
      missingFields.push('FSSAI License Number (mandatory for grocery & food sales)');
    }

    // Step 4 Validation
    if (!seller.bankAccountHolderName?.trim()) missingFields.push('Bank Account Holder Name');
    if (!seller.bankAccountNumberEncrypted) missingFields.push('Bank Account Number');
    if (!seller.bankIfscCode?.trim()) missingFields.push('Bank IFSC Code');
    if (!seller.bankAccountType?.trim()) missingFields.push('Bank Account Type');

    // Step 5 Validation (Documents)
    const uploadedTypes = new Set(seller.documents.map((d) => d.documentType));
    const missingDocs: string[] = [];

    if (!uploadedTypes.has('PAN_CARD')) missingDocs.push('PAN Card Copy');
    if (!uploadedTypes.has('BANK_PROOF')) missingDocs.push('Cancelled Cheque or Bank Passbook');
    if (!uploadedTypes.has('ADDRESS_PROOF')) missingDocs.push('Store Address Proof');
    if (isFoodCategory && !uploadedTypes.has('FSSAI_CERTIFICATE')) {
      missingDocs.push('FSSAI Certificate');
    }
    if (seller.gstin && !uploadedTypes.has('GST_CERTIFICATE')) {
      missingDocs.push('GST Registration Certificate');
    }

    if (missingFields.length > 0 || missingDocs.length > 0) {
      const allErrors = [
        ...missingFields.map((f) => `Missing field: ${f}`),
        ...missingDocs.map((d) => `Missing document: ${d}`),
      ];
      throw new BadRequestException({
        message: 'Cannot submit application with missing mandatory information',
        errors: allErrors,
      });
    }

    // Execute state transition atomically
    const previousStatus = seller.status;
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSeller = await tx.seller.update({
        where: { id: seller.id },
        data: {
          status: SellerStatus.PENDING_VERIFICATION,
          isSubmitted: true,
          submittedAt: new Date(),
          rejectionReason: null,
        },
        include: { profile: true, documents: true },
      });

      await tx.sellerStatusHistory.create({
        data: {
          sellerId: seller.id,
          fromStatus: previousStatus,
          toStatus: SellerStatus.PENDING_VERIFICATION,
          reason: 'Application submitted for administrative review',
          changedBy: userId,
        },
      });

      return updatedSeller;
    });

    // Dispatch email notification
    if (seller.owner.email) {
      await this.emailService.sendSellerApplicationSubmittedEmail(
        seller.owner.email,
        seller.owner.name,
        seller.storeDisplayName || seller.businessName,
        seller.id,
      );
    }

    return this.formatSellerApplication(updated, seller.owner);
  }

  /**
   * Retrieve application status overview.
   */
  async getStatus(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
      include: {
        documents: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!seller) {
      throw new NotFoundException('No seller application found');
    }

    const verifiedDocs = seller.documents.filter(
      (d) => d.verificationStatus === VerificationStatus.VERIFIED,
    ).length;

    return {
      sellerId: seller.id,
      status: seller.status,
      isSubmitted: seller.isSubmitted,
      submittedAt: seller.submittedAt,
      approvalDate: seller.approvalDate,
      rejectionReason: seller.rejectionReason,
      suspensionReason: seller.suspensionReason,
      currentStep: seller.currentStep,
      totalDocuments: seller.documents.length,
      verifiedDocuments: verifiedDocs,
      recentHistory: seller.statusHistory,
    };
  }

  /**
   * Get operational seller profile (for approved sellers).
   */
  async getProfile(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
      include: { profile: true, owner: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return {
      id: seller.id,
      businessName: seller.businessName,
      storeDisplayName: seller.storeDisplayName,
      status: seller.status,
      ownerName: seller.owner.name,
      ownerEmail: seller.owner.email,
      ownerPhone: seller.businessPhone || seller.owner.phone,
      logoUrl: seller.profile?.logoUrl,
      bannerUrl: seller.profile?.bannerUrl,
      description: seller.profile?.description,
      addressLine1: seller.profile?.addressLine1,
      addressLine2: seller.profile?.addressLine2,
      landmark: seller.profile?.landmark,
      city: seller.profile?.city,
      state: seller.profile?.state,
      postalCode: seller.profile?.postalCode,
      country: seller.profile?.country,
    };
  }

  /**
   * Update operational seller profile.
   */
  async updateProfile(userId: string, dto: UpdateSellerProfileDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
      include: { profile: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { sellerId: seller.id },
      data: {
        logoUrl: dto.logoUrl ?? seller.profile?.logoUrl,
        bannerUrl: dto.bannerUrl ?? seller.profile?.bannerUrl,
        description: dto.description ?? seller.profile?.description,
        addressLine1: dto.addressLine1 ?? seller.profile?.addressLine1,
        addressLine2: dto.addressLine2 ?? seller.profile?.addressLine2,
        landmark: dto.landmark ?? seller.profile?.landmark,
        city: dto.city ?? seller.profile?.city,
        state: dto.state ?? seller.profile?.state,
        postalCode: dto.postalCode ?? seller.profile?.postalCode,
      },
    });

    return updated;
  }

  /**
   * Get operational seller store details.
   */
  async getStore(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
      include: { profile: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return {
      id: seller.id,
      storeDisplayName: seller.storeDisplayName || seller.businessName,
      storeCategory: seller.storeCategory,
      openingTime: seller.profile?.openingTime,
      closingTime: seller.profile?.closingTime,
      weeklyOffDays: seller.profile?.weeklyOffDays,
      serviceRadiusKm: seller.profile?.serviceRadiusKm ? Number(seller.profile.serviceRadiusKm) : 5,
      preparationTime: seller.profile?.preparationTime || 15,
      storefrontPhotoUrl: seller.profile?.storefrontPhotoUrl,
      storeInteriorPhotoUrl: seller.profile?.storeInteriorPhotoUrl,
      status: seller.status,
    };
  }

  /**
   * Update operational seller store details.
   */
  async updateStore(userId: string, dto: UpdateSellerStoreDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: userId },
      include: { profile: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (dto.storeDisplayName) {
      await this.prisma.seller.update({
        where: { id: seller.id },
        data: { storeDisplayName: dto.storeDisplayName },
      });
    }

    const updatedProfile = await this.prisma.sellerProfile.update({
      where: { sellerId: seller.id },
      data: {
        openingTime: dto.openingTime ?? seller.profile?.openingTime,
        closingTime: dto.closingTime ?? seller.profile?.closingTime,
        weeklyOffDays: dto.weeklyOffDays ?? seller.profile?.weeklyOffDays,
        serviceRadiusKm:
          dto.serviceRadiusKm !== undefined
            ? new Decimal(dto.serviceRadiusKm)
            : seller.profile?.serviceRadiusKm,
        preparationTime: dto.preparationTime ?? seller.profile?.preparationTime,
        storefrontPhotoUrl: dto.storefrontPhotoUrl ?? seller.profile?.storefrontPhotoUrl,
        storeInteriorPhotoUrl: dto.storeInteriorPhotoUrl ?? seller.profile?.storeInteriorPhotoUrl,
      },
    });

    return {
      storeDisplayName: dto.storeDisplayName || seller.storeDisplayName,
      ...updatedProfile,
    };
  }

  /**
   * Format seller application response masking sensitive identifiers.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatSellerApplication(seller: any, user?: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documents = (seller.documents || []).map((doc: any) => ({
      id: doc.id,
      sellerId: doc.sellerId,
      documentType: doc.documentType,
      documentUrl: doc.documentUrl,
      cloudinaryPublicId: doc.cloudinaryPublicId,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      verificationStatus: doc.verificationStatus,
      verifiedBy: doc.verifiedBy,
      verifiedAt: doc.verifiedAt,
      rejectionReason: doc.rejectionReason,
      expiryDate: doc.expiryDate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      signedPreviewUrl: doc.cloudinaryPublicId
        ? this.cloudinary.generateSignedUrl(doc.cloudinaryPublicId, {
            resourceType: doc.mimeType === 'application/pdf' ? 'raw' : 'image',
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

      // Step 1
      ownerName: user?.name,
      ownerEmail: user?.email,
      ownerPhone: seller.businessPhone || user?.phone,
      isEmailVerified: !!user?.emailVerifiedAt,
      profilePhotoUrl: seller.profile?.logoUrl,

      // Step 2
      storeDisplayName: seller.storeDisplayName,
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
      serviceRadiusKm: seller.profile?.serviceRadiusKm ? Number(seller.profile.serviceRadiusKm) : 5,
      openingTime: seller.profile?.openingTime,
      closingTime: seller.profile?.closingTime,
      weeklyOffDays: seller.profile?.weeklyOffDays,
      storefrontPhotoUrl: seller.profile?.storefrontPhotoUrl,
      storeInteriorPhotoUrl: seller.profile?.storeInteriorPhotoUrl,

      // Step 3
      legalBusinessName: seller.legalBusinessName,
      businessEntityType: seller.businessEntityType,
      pan: seller.pan,
      gstin: seller.gstin,
      fssaiNumber: seller.fssaiNumber,
      fssaiExpiryDate: seller.fssaiExpiryDate,
      shopEstablishmentNumber: seller.shopEstablishmentNumber,

      // Step 4 (Sensitive bank details: account number is masked)
      bankAccountHolderName: seller.bankAccountHolderName,
      bankAccountNumberMasked: seller.bankAccountNumberMasked,
      bankIfscCode: seller.bankIfscCode,
      bankName: seller.bankName,
      bankAccountType: seller.bankAccountType,
      upiId: seller.upiId,

      // Step 5
      documents,
      statusHistory: seller.statusHistory || [],
    };
  }
}
