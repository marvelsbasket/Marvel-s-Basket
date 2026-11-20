import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminSellersService } from './admin-sellers.service';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EmailService } from '../email/email.service';
import { SellerStatus, UserRoleType, VerificationStatus } from '@prisma/client';
import { DocumentReviewActionStatus } from './dto';

describe('AdminSellersService', () => {
  let service: AdminSellersService;
  let prisma: any;
  let cloudinary: any;
  let emailService: any;

  const mockAdminUser = {
    id: 'admin-uuid-1',
    name: 'Marvel SuperAdmin',
    email: 'admin@marvelsbasket.com',
  };

  const mockSeller = {
    id: 'seller-uuid-1',
    ownerUserId: 'user-uuid-1',
    businessName: 'Gupta Supermart',
    storeDisplayName: 'Gupta Supermart',
    storeCategory: 'GROCERY',
    status: SellerStatus.PENDING_VERIFICATION,
    owner: {
      id: 'user-uuid-1',
      name: 'Rajesh Gupta',
      email: 'rajesh@example.com',
      phone: '9876543210',
    },
    profile: {
      addressLine1: 'Shop #4, Main Market',
      city: 'Azamgarh',
      state: 'Uttar Pradesh',
    },
    documents: [
      {
        id: 'doc-1',
        sellerId: 'seller-uuid-1',
        documentType: 'PAN_CARD',
        documentUrl: 'https://cloudinary.com/pan.pdf',
        verificationStatus: VerificationStatus.VERIFIED,
      },
      {
        id: 'doc-2',
        sellerId: 'seller-uuid-1',
        documentType: 'BANK_PROOF',
        documentUrl: 'https://cloudinary.com/cheque.pdf',
        verificationStatus: VerificationStatus.VERIFIED,
      },
      {
        id: 'doc-3',
        sellerId: 'seller-uuid-1',
        documentType: 'ADDRESS_PROOF',
        documentUrl: 'https://cloudinary.com/address.pdf',
        verificationStatus: VerificationStatus.VERIFIED,
      },
      {
        id: 'doc-4',
        sellerId: 'seller-uuid-1',
        documentType: 'FSSAI_CERTIFICATE',
        documentUrl: 'https://cloudinary.com/fssai.pdf',
        verificationStatus: VerificationStatus.VERIFIED,
      },
    ],
    statusHistory: [],
  };

  beforeEach(async () => {
    prisma = {
      seller: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sellerDocument: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      sellerDocumentReview: {
        create: jest.fn(),
      },
      sellerStatusHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      role: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'role-seller-uuid', name: UserRoleType.SELLER }),
      },
      userRole: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    cloudinary = {
      generateSignedUrl: jest.fn().mockReturnValue('https://signed-url.com/preview'),
    };

    emailService = {
      sendSellerApprovedEmail: jest.fn().mockResolvedValue({ success: true }),
      sendSellerRejectedEmail: jest.fn().mockResolvedValue({ success: true }),
      sendSellerSuspendedEmail: jest.fn().mockResolvedValue({ success: true }),
      sendSellerReactivatedEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSellersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinary },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AdminSellersService>(AdminSellersService);
  });

  describe('listApplications', () => {
    it('should return paginated list of applications', async () => {
      prisma.seller.count.mockResolvedValue(1);
      prisma.seller.findMany.mockResolvedValue([mockSeller]);

      const result = await service.listApplications({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].storeDisplayName).toBe(mockSeller.storeDisplayName);
    });
  });

  describe('reviewDocument', () => {
    it('should mark document verified and record audit history', async () => {
      prisma.sellerDocument.findFirst.mockResolvedValue(mockSeller.documents[0]);
      prisma.sellerDocument.update.mockResolvedValue({
        ...mockSeller.documents[0],
        verificationStatus: VerificationStatus.VERIFIED,
      });

      const result = await service.reviewDocument(mockAdminUser.id, mockSeller.id, 'doc-1', {
        status: DocumentReviewActionStatus.VERIFIED,
      });

      expect(prisma.sellerDocument.update).toHaveBeenCalled();
      expect(prisma.sellerDocumentReview.create).toHaveBeenCalled();
      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
    });

    it('should require a reason when rejecting a document', async () => {
      prisma.sellerDocument.findFirst.mockResolvedValue(mockSeller.documents[0]);

      await expect(
        service.reviewDocument(mockAdminUser.id, mockSeller.id, 'doc-1', {
          status: DocumentReviewActionStatus.REJECTED,
          notes: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveSeller', () => {
    it('should approve eligible seller, grant SELLER role, and notify merchant', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      prisma.seller.update.mockResolvedValue({
        ...mockSeller,
        status: SellerStatus.APPROVED_ACTIVE,
      });

      const result = await service.approveSeller(mockAdminUser.id, mockSeller.id);

      expect(prisma.seller.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SellerStatus.APPROVED_ACTIVE,
          }),
        }),
      );
      expect(prisma.userRole.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: mockSeller.ownerUserId,
            roleId: 'role-seller-uuid',
          }),
        }),
      );
      expect(emailService.sendSellerApprovedEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should fail approval if mandatory document is unverified', async () => {
      const sellerWithUnverifiedDoc = {
        ...mockSeller,
        documents: [
          { ...mockSeller.documents[0], verificationStatus: VerificationStatus.PENDING },
          ...mockSeller.documents.slice(1),
        ],
      };
      prisma.seller.findUnique.mockResolvedValue(sellerWithUnverifiedDoc);

      await expect(service.approveSeller(mockAdminUser.id, mockSeller.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectSeller', () => {
    it('should reject application with reason, record history, and notify merchant', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      prisma.seller.update.mockResolvedValue({
        ...mockSeller,
        status: SellerStatus.REJECTED,
      });

      const result = await service.rejectSeller(mockAdminUser.id, mockSeller.id, {
        reason: 'Missing clear trade address proof',
      });

      expect(prisma.seller.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SellerStatus.REJECTED,
            rejectionReason: 'Missing clear trade address proof',
          }),
        }),
      );
      expect(emailService.sendSellerRejectedEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('suspendSeller & reactivateSeller', () => {
    it('should suspend active seller and notify merchant', async () => {
      prisma.seller.findUnique.mockResolvedValue({
        ...mockSeller,
        status: SellerStatus.APPROVED_ACTIVE,
      });
      prisma.seller.update.mockResolvedValue({
        ...mockSeller,
        status: SellerStatus.SUSPENDED,
      });

      const result = await service.suspendSeller(mockAdminUser.id, mockSeller.id, {
        reason: 'Expired food license',
      });

      expect(prisma.seller.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SellerStatus.SUSPENDED,
            suspensionReason: 'Expired food license',
          }),
        }),
      );
      expect(emailService.sendSellerSuspendedEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should reactivate suspended seller and notify merchant', async () => {
      prisma.seller.findUnique.mockResolvedValue({
        ...mockSeller,
        status: SellerStatus.SUSPENDED,
      });
      prisma.seller.update.mockResolvedValue({
        ...mockSeller,
        status: SellerStatus.APPROVED_ACTIVE,
      });

      const result = await service.reactivateSeller(mockAdminUser.id, mockSeller.id);

      expect(prisma.seller.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SellerStatus.APPROVED_ACTIVE,
            suspensionReason: null,
          }),
        }),
      );
      expect(emailService.sendSellerReactivatedEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
