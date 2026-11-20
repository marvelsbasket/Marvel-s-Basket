import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { validationExceptionFactory } from '../src/common/pipes/validation-factory';
import { PrismaService } from '../src/database/prisma.service';
import { EmailService } from '../src/modules/email/email.service';
import { SellerStatus, VerificationStatus } from '@prisma/client';

describe('Seller Onboarding & KYC Management (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;

  const timestamp = Date.now();
  const applicantAlice = {
    name: 'Seller Alice Gupta',
    email: `seller.alice.${timestamp}@example.com`,
    password: 'Password@Alice123!',
    phone: '9876543210',
  };

  const customerBob = {
    name: 'Customer Bob',
    email: `customer.bob.${timestamp}@example.com`,
    password: 'Password@Bob123!',
    phone: '9876543211',
  };

  const adminCredentials = {
    email: 'admin@marvelsbasket.com',
    password: 'MarvelDevPassword2026!',
  };

  let tokenAlice: string;
  let tokenBob: string;
  let tokenAdmin: string;
  let aliceSellerId: string;
  let panDocId: string;
  let bankDocId: string;
  let addrDocId: string;
  let fssaiDocId: string;

  let capturedOtpAlice: string | null = null;
  let capturedOtpBob: string | null = null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: validationExceptionFactory,
      }),
    );

    const reflector = app.get(Reflector);
    app.useGlobalFilters(new AllExceptionsFilter(reflector));
    app.useGlobalInterceptors(new TransformInterceptor(reflector));

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    emailService = app.get<EmailService>(EmailService);

    // Spy on EmailService to capture OTPs
    jest
      .spyOn(emailService, 'sendVerificationOtpEmail')
      .mockImplementation(async (to, name, otp) => {
        if (to === applicantAlice.email) capturedOtpAlice = otp;
        if (to === customerBob.email) capturedOtpBob = otp;
        return { success: true, messageId: 'mock-e2e-msg' };
      });

    // 1. Register & verify Alice (Seller applicant)
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(applicantAlice)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email: applicantAlice.email, otp: capturedOtpAlice })
      .expect(200);

    const loginAlice = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: applicantAlice.email, password: applicantAlice.password })
      .expect(200);
    tokenAlice = loginAlice.body.data.tokens.accessToken;

    // 2. Register & verify Bob (Standard customer)
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(customerBob).expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email: customerBob.email, otp: capturedOtpBob })
      .expect(200);

    const loginBob = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customerBob.email, password: customerBob.password })
      .expect(200);
    tokenBob = loginBob.body.data.tokens.accessToken;

    // 3. Login Super Admin
    const loginAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(200);
    tokenAdmin = loginAdmin.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Cleanup created test accounts
    try {
      if (aliceSellerId) {
        await prisma.sellerDocumentReview.deleteMany({
          where: { document: { sellerId: aliceSellerId } },
        });
        await prisma.sellerDocument.deleteMany({ where: { sellerId: aliceSellerId } });
        await prisma.sellerStatusHistory.deleteMany({ where: { sellerId: aliceSellerId } });
        await prisma.sellerProfile.deleteMany({ where: { sellerId: aliceSellerId } });
        await prisma.seller.deleteMany({ where: { id: aliceSellerId } });
      }
      await prisma.user.deleteMany({
        where: { email: { in: [applicantAlice.email, customerBob.email] } },
      });
    } catch {
      // ignore cleanup errors
    }
    await app.close();
  });

  describe('1. Seller Application Draft & Step Updates', () => {
    it('Alice initiates seller application draft', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sellers/applications')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          storeDisplayName: 'Gupta Fresh Daily',
          storeCategory: 'GROCERY',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SellerStatus.DRAFT);
      expect(res.body.data.storeDisplayName).toBe('Gupta Fresh Daily');
      aliceSellerId = res.body.data.id;
    });

    it('Cross-user isolation: Bob cannot view or modify Alice application', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sellers/me/application')
        .set('Authorization', `Bearer ${tokenBob}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('Alice updates Step 2 (Store & Address) and Step 3 (Business Details)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/sellers/me/application')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          currentStep: 3,
          storeDisplayName: 'Gupta Fresh Daily Mart',
          storeCategory: 'GROCERY',
          addressLine1: 'Shop #12, Market Square',
          city: 'Azamgarh',
          state: 'Uttar Pradesh',
          postalCode: '276001',
          latitude: 26.0688,
          longitude: 83.1859,
          serviceRadiusKm: 5,
          openingTime: '07:00',
          closingTime: '22:00',
          weeklyOffDays: 'None',
          legalBusinessName: 'Gupta Enterprises LLP',
          businessEntityType: 'LLP',
          pan: 'ABCDE1234F',
          fssaiNumber: '12345678901234',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.legalBusinessName).toBe('Gupta Enterprises LLP');
      expect(res.body.data.pan).toBe('ABCDE1234F');
      expect(res.body.data.fssaiNumber).toBe('12345678901234');
    });

    it('Alice updates Step 4 (Bank Details) with double entry and masked response', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/sellers/me/application')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          currentStep: 4,
          bankAccountHolderName: 'Gupta Enterprises LLP',
          bankAccountNumber: '98765432101234',
          confirmBankAccountNumber: '98765432101234',
          bankIfscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          bankAccountType: 'CURRENT',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      // Verify sensitive bank account number is NEVER returned in raw form
      expect(res.body.data.bankAccountNumberMasked).toBe('••••••••••1234');
      expect(res.body.data.bankAccountNumber).toBeUndefined();
      expect(res.body.data.bankAccountNumberEncrypted).toBeUndefined();
    });

    it('Bank mismatch rejection when account numbers differ', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/sellers/me/application')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          bankAccountNumber: '98765432101234',
          confirmBankAccountNumber: '11111111111111',
        })
        .expect(400);
    });
  });

  describe('2. KYC Document Uploads & Storage', () => {
    it('Alice uploads PAN Card copy', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sellers/me/documents')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .field('documentType', 'PAN_CARD')
        .attach('file', Buffer.from('mock-pan-card-pdf-bytes'), {
          filename: 'pan_card.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.documentType).toBe('PAN_CARD');
      expect(res.body.data.verificationStatus).toBe(VerificationStatus.PENDING);
      expect(res.body.data.signedPreviewUrl).toBeDefined();
      panDocId = res.body.data.id;
    });

    it('Alice uploads Bank Proof (Cancelled Cheque)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sellers/me/documents')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .field('documentType', 'BANK_PROOF')
        .attach('file', Buffer.from('mock-cheque-image-bytes'), {
          filename: 'cancelled_cheque.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.documentType).toBe('BANK_PROOF');
      bankDocId = res.body.data.id;
    });

    it('Alice uploads Address Proof', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sellers/me/documents')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .field('documentType', 'ADDRESS_PROOF')
        .attach('file', Buffer.from('mock-address-proof-bytes'), {
          filename: 'electricity_bill.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      addrDocId = res.body.data.id;
    });

    it('Alice uploads FSSAI Certificate (Mandatory for Grocery)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sellers/me/documents')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .field('documentType', 'FSSAI_CERTIFICATE')
        .field('expiryDate', '2028-12-31')
        .attach('file', Buffer.from('mock-fssai-cert-bytes'), {
          filename: 'fssai_cert.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      fssaiDocId = res.body.data.id;
    });

    it('Alice lists her uploaded documents with signed preview URLs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sellers/me/documents')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.data[0].signedPreviewUrl).toBeDefined();
    });
  });

  describe('3. Application Submission & Verification State Machine', () => {
    it('Alice submits completed application -> transitions to PENDING_VERIFICATION', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sellers/me/application/submit')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SellerStatus.PENDING_VERIFICATION);
      expect(res.body.data.isSubmitted).toBe(true);
    });

    it('Submitted application is locked against ordinary seller edits', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/sellers/me/application')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({ storeDisplayName: 'Hacked Store Name' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('locked');
    });

    it('Alice cannot submit again while in PENDING_VERIFICATION', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/sellers/me/application/submit')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .expect(400);
    });
  });

  describe('4. Admin Review, Document Verification & Store Activation', () => {
    it('Non-admin users are strictly blocked from admin review endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/sellers')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/v1/admin/sellers')
        .set('Authorization', `Bearer ${tokenBob}`)
        .expect(403);
    });

    it('Admin lists seller applications and sees Alice pending application', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/sellers?status=PENDING_VERIFICATION')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.some((i: any) => i.id === aliceSellerId)).toBe(true);
    });

    it('Admin inspects Alice application detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/sellers/${aliceSellerId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.business.pan).toBe('ABCDE1234F');
      expect(res.body.data.bank.accountNumberMasked).toBe('••••••••••1234');
      expect(res.body.data.documents).toHaveLength(4);
    });

    it('Admin attempts premature approval with unverified documents -> fails with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/sellers/${aliceSellerId}/approve`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('mandatory documents must be reviewed and verified');
    });

    it('Admin reviews and verifies all 4 KYC documents', async () => {
      for (const docId of [panDocId, bankDocId, addrDocId, fssaiDocId]) {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/admin/sellers/${aliceSellerId}/documents/${docId}/review`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({ status: 'VERIFIED', notes: 'Document verified and approved' })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.verificationStatus).toBe(VerificationStatus.VERIFIED);
      }
    });

    it('Admin approves Alice application -> transitions to APPROVED_ACTIVE & grants SELLER role', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/sellers/${aliceSellerId}/approve`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.seller.status).toBe(SellerStatus.APPROVED_ACTIVE);

      // Verify Alice user account now has SELLER role
      const userAlice = await prisma.user.findUnique({
        where: { email: applicantAlice.email },
        include: { userRoles: { include: { role: true } } },
      });
      const roles = userAlice?.userRoles.map((ur) => ur.role.name);
      expect(roles).toContain('SELLER');
    });

    it('Admin suspends Alice store -> status becomes SUSPENDED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/sellers/${aliceSellerId}/suspend`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ reason: 'Audit pending for temperature logs' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.seller.status).toBe(SellerStatus.SUSPENDED);
    });

    it('Admin reactivates Alice store -> status returns to APPROVED_ACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/sellers/${aliceSellerId}/reactivate`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.seller.status).toBe(SellerStatus.APPROVED_ACTIVE);
    });

    it('Audit trail records all transitions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/sellers/${aliceSellerId}/history`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });
});
