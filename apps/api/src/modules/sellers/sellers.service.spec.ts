import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EmailService } from '../email/email.service';
import { Prisma, SellerStatus, VerificationStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('SellersService', () => {
  let service: SellersService;
  let prisma: any;
  let cloudinary: any;
  let emailService: any;

  const mockUser = {
    id: 'user-uuid-1',
    name: 'Rajesh Gupta',
    email: 'rajesh@example.com',
    phone: '9876543210',
    emailVerifiedAt: new Date(),
  };

  const mockSeller = {
    id: 'seller-uuid-1',
    ownerUserId: 'user-uuid-1',
    businessName: 'Gupta Supermart',
    storeDisplayName: 'Gupta Supermart',
    storeCategory: 'GROCERY',
    slug: 'gupta-supermart-1234',
    businessEmail: 'rajesh@example.com',
    businessPhone: '9876543210',
    status: SellerStatus.DRAFT,
    currentStep: 1,
    isSubmitted: false,
    legalBusinessName: 'Gupta Retailers',
    businessEntityType: 'SOLE_PROPRIETORSHIP',
    pan: 'ABCDE1234F',
    fssaiNumber: '12345678901234',
    bankAccountHolderName: 'Rajesh Gupta',
    bankAccountNumberEncrypted: 'iv:tag:enc',
    bankAccountNumberMasked: '••••••••1234',
    bankIfscCode: 'SBIN0001234',
    bankAccountType: 'CURRENT',
    profile: {
      addressLine1: 'Shop #4, Main Market',
      city: 'Azamgarh',
      state: 'Uttar Pradesh',
      postalCode: '276001',
      openingTime: '08:00',
      closingTime: '22:00',
      serviceRadiusKm: new Decimal(5.0),
    },
    documents: [
      {
        id: 'doc-1',
        sellerId: 'seller-uuid-1',
        documentType: 'PAN_CARD',
        documentUrl: 'https://cloudinary.com/pan.pdf',
        cloudinaryPublicId: 'pan-id',
        verificationStatus: VerificationStatus.PENDING,
      },
      {
        id: 'doc-2',
        sellerId: 'seller-uuid-1',
        documentType: 'BANK_PROOF',
        documentUrl: 'https://cloudinary.com/cheque.pdf',
        cloudinaryPublicId: 'cheque-id',
        verificationStatus: VerificationStatus.PENDING,
      },
      {
        id: 'doc-3',
        sellerId: 'seller-uuid-1',
        documentType: 'ADDRESS_PROOF',
        documentUrl: 'https://cloudinary.com/address.pdf',
        cloudinaryPublicId: 'addr-id',
        verificationStatus: VerificationStatus.PENDING,
      },
      {
        id: 'doc-4',
        sellerId: 'seller-uuid-1',
        documentType: 'FSSAI_CERTIFICATE',
        documentUrl: 'https://cloudinary.com/fssai.pdf',
        cloudinaryPublicId: 'fssai-id',
        verificationStatus: VerificationStatus.PENDING,
      },
    ],
    owner: mockUser,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      seller: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      sellerProfile: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
      sellerDocument: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      sellerStatusHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    cloudinary = {
      uploadPrivateDocument: jest.fn().mockResolvedValue({
        publicId: 'marvels-basket/sellers/kyc/pan/mock_123.pdf',
        secureUrl: 'https://cloudinary.com/mock_123.pdf',
        format: 'pdf',
        bytes: 2048,
        resourceType: 'raw',
        accessMode: 'authenticated',
      }),
      generateSignedUrl: jest.fn().mockReturnValue('https://signed-url.com/preview'),
      deleteResource: jest.fn().mockResolvedValue(true),
    };

    emailService = {
      sendSellerApplicationSubmittedEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinary },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<SellersService>(SellersService);
  });

  describe('getOrCreateApplication', () => {
    it('should return existing application if seller already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        seller: mockSeller,
      });

      const result = await service.getOrCreateApplication('user-uuid-1');
      expect(result.id).toBe(mockSeller.id);
      expect(result.businessName).toBe(mockSeller.businessName);
    });

    it('should create new application draft if user has no seller profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        seller: null,
      });

      prisma.seller.create.mockResolvedValue(mockSeller);

      const result = await service.getOrCreateApplication('user-uuid-1', {
        storeDisplayName: 'Gupta Supermart',
        storeCategory: 'GROCERY',
      });

      expect(prisma.seller.create).toHaveBeenCalled();
      expect(result.id).toBe(mockSeller.id);
    });
  });

  describe('updateApplication', () => {
    it('should update draft fields and encrypt bank account number', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      prisma.seller.update.mockResolvedValue(mockSeller);

      await service.updateApplication('user-uuid-1', {
        legalBusinessName: 'Gupta Retailers',
        bankAccountNumber: '98765432101234',
        confirmBankAccountNumber: '98765432101234',
        bankIfscCode: 'SBIN0001234',
      });

      expect(prisma.seller.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            legalBusinessName: 'Gupta Retailers',
            bankIfscCode: 'SBIN0001234',
            bankAccountNumberMasked: expect.stringContaining('1234'),
          }),
        }),
      );
    });

    it('should throw BadRequestException if bank accounts do not match', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);

      await expect(
        service.updateApplication('user-uuid-1', {
          bankAccountNumber: '123456789012',
          confirmBankAccountNumber: '999999999999',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject updates if application is already PENDING_VERIFICATION', async () => {
      prisma.seller.findUnique.mockResolvedValue({
        ...mockSeller,
        status: SellerStatus.PENDING_VERIFICATION,
      });

      await expect(
        service.updateApplication('user-uuid-1', {
          storeDisplayName: 'New Name',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitApplication', () => {
    it('should successfully submit valid complete application and notify seller', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      prisma.seller.update.mockResolvedValue({
        ...mockSeller,
        status: SellerStatus.PENDING_VERIFICATION,
        isSubmitted: true,
      });

      const result = await service.submitApplication('user-uuid-1');

      expect(prisma.seller.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SellerStatus.PENDING_VERIFICATION,
            isSubmitted: true,
          }),
        }),
      );
      expect(prisma.sellerStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toStatus: SellerStatus.PENDING_VERIFICATION,
          }),
        }),
      );
      expect(emailService.sendSellerApplicationSubmittedEmail).toHaveBeenCalled();
      expect(result.status).toBe(SellerStatus.PENDING_VERIFICATION);
    });

    it('should throw BadRequestException if mandatory document is missing', async () => {
      const incompleteSeller = {
        ...mockSeller,
        documents: [], // missing all documents
      };
      prisma.seller.findUnique.mockResolvedValue(incompleteSeller);

      await expect(service.submitApplication('user-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email is not verified', async () => {
      const unverifiedUserSeller = {
        ...mockSeller,
        owner: { ...mockUser, emailVerifiedAt: null },
      };
      prisma.seller.findUnique.mockResolvedValue(unverifiedUserSeller);

      await expect(service.submitApplication('user-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadDocument & deleteDocument', () => {
    it('should upload a document and save to database', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      prisma.sellerDocument.findFirst.mockResolvedValue(null);
      prisma.sellerDocument.create.mockResolvedValue({
        id: 'doc-new',
        sellerId: mockSeller.id,
        documentType: 'PAN_CARD',
        documentUrl: 'https://cloudinary.com/new.pdf',
        cloudinaryPublicId: 'pan-new',
        verificationStatus: VerificationStatus.PENDING,
      });

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'pan.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('bytes'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const result = await service.uploadDocument('user-uuid-1', mockFile, {
        documentType: 'PAN_CARD' as any,
      });

      expect(cloudinary.uploadPrivateDocument).toHaveBeenCalled();
      expect(prisma.sellerDocument.create).toHaveBeenCalled();
      expect(result.signedPreviewUrl).toBeDefined();
    });

    it('should delete eligible document', async () => {
      prisma.seller.findUnique.mockResolvedValue(mockSeller);
      prisma.sellerDocument.findFirst.mockResolvedValue(mockSeller.documents[0]);
      prisma.sellerDocument.delete.mockResolvedValue(mockSeller.documents[0]);

      const result = await service.deleteDocument('user-uuid-1', 'doc-1');
      expect(result.success).toBe(true);
      expect(cloudinary.deleteResource).toHaveBeenCalled();
      expect(prisma.sellerDocument.delete).toHaveBeenCalled();
    });

    it('should return empty status when no seller application exists', async () => {
      prisma.seller.findUnique.mockResolvedValue(null);

      const status = await service.getStatus('user-uuid-without-seller');
      expect(status.status).toBeNull();
      expect(status.sellerId).toBeNull();
      expect(status.isSubmitted).toBe(false);
    });

    it('should recover from concurrent P2002 race condition on getOrCreateApplication', async () => {
      const p2002Error = new Error('Unique constraint failed on owner_user_id') as any;
      p2002Error.code = 'P2002';
      Object.setPrototypeOf(p2002Error, Prisma.PrismaClientKnownRequestError.prototype);

      // First call has no seller
      prisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, seller: null });
      // Create fails with P2002
      prisma.seller.create.mockRejectedValueOnce(p2002Error);
      // Recovery call finds the newly created seller
      prisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, seller: mockSeller });

      const res = await service.getOrCreateApplication('user-uuid-1');
      expect(res.id).toBe(mockSeller.id);
    });
  });
});
