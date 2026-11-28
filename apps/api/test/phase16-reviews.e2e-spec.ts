import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentMethod,
  ProductStatus,
  ReviewReportReason,
  ReviewStatus,
  SellerProductStatus,
  SellerStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Phase 16 — Reviews & Ratings (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const runId = crypto.randomUUID().slice(0, 8);
  let cust1Token: string;
  let cust2Token: string;
  let sellerToken: string;
  let adminToken: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);
    const secret = configService.get<string>('jwt.accessSecret');

    const [custRole, sellerRole, adminRole] = await Promise.all([
      prisma.role.upsert({
        where: { name: 'CUSTOMER' },
        update: {},
        create: { name: 'CUSTOMER', roleType: UserRoleType.CUSTOMER, description: 'Customer' },
      }),
      prisma.role.upsert({
        where: { name: 'SELLER' },
        update: {},
        create: { name: 'SELLER', roleType: UserRoleType.SELLER, description: 'Seller' },
      }),
      prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: { name: 'ADMIN', roleType: UserRoleType.ADMIN, description: 'Admin' },
      }),
    ]);

    const c1 = await prisma.user.create({
      data: {
        name: `P16 Cust1 ${runId}`,
        email: `p16-c1-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: custRole.id } },
      },
    });
    cust1Token = jwtService.sign({ sub: c1.id, email: c1.email, roles: ['CUSTOMER'] }, { secret });

    const c2 = await prisma.user.create({
      data: {
        name: `P16 Cust2 ${runId}`,
        email: `p16-c2-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: custRole.id } },
      },
    });
    cust2Token = jwtService.sign({ sub: c2.id, email: c2.email, roles: ['CUSTOMER'] }, { secret });

    const admin = await prisma.user.create({
      data: {
        name: `P16 Admin ${runId}`,
        email: `p16-admin-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: adminRole.id } },
      },
    });
    adminToken = jwtService.sign(
      { sub: admin.id, email: admin.email, roles: ['ADMIN'] },
      { secret },
    );

    const sellerOwner = await prisma.user.create({
      data: {
        name: `P16 Seller ${runId}`,
        email: `p16-seller-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: sellerRole.id } },
      },
    });
    sellerToken = jwtService.sign(
      { sub: sellerOwner.id, email: sellerOwner.email, roles: ['SELLER'] },
      { secret },
    );

    const seller = await prisma.seller.create({
      data: {
        ownerUserId: sellerOwner.id,
        businessName: `P16 Store ${runId}`,
        slug: `p16-store-${runId}`,
        businessEmail: `p16-store-${runId}@test.com`,
        businessPhone: '9876543210',
        status: SellerStatus.APPROVED_ACTIVE,
      },
    });

    const category = await prisma.category.create({
      data: { name: `P16 Cat ${runId}`, slug: `p16-cat-${runId}`, isActive: true },
    });
    const product = await prisma.product.create({
      data: {
        name: `P16 Honey ${runId}`,
        slug: `p16-honey-${runId}`,
        categoryId: category.id,
        status: ProductStatus.ACTIVE,
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: '250g',
        packSize: '250g',
        sku: `P16-SKU-${runId}`,
        mrp: 200,
        isActive: true,
      },
    });
    const listing = await prisma.sellerProduct.create({
      data: {
        sellerId: seller.id,
        productId: product.id,
        variantId: variant.id,
        sellingPrice: 180,
        status: SellerProductStatus.ACTIVE,
      },
    });

    // Customer 1 has a DELIVERED order; Customer 2 has only a CANCELLED order
    await prisma.order.create({
      data: {
        orderNumber: `MB-P16-DEL-${runId}`,
        customerId: c1.id,
        sellerId: seller.id,
        addressSnapshot: { city: 'Azamgarh' },
        subtotal: 180,
        deliveryFee: 0,
        totalAmount: 180,
        status: OrderStatus.DELIVERED,
        paymentMethod: PaymentMethod.COD,
        items: {
          create: {
            sellerProductId: listing.id,
            productIdSnapshot: product.id,
            productNameSnapshot: product.name,
            unitPrice: 180,
            quantity: 1,
            totalAmount: 180,
          },
        },
      },
    });

    await prisma.order.create({
      data: {
        orderNumber: `MB-P16-CAN-${runId}`,
        customerId: c2.id,
        sellerId: seller.id,
        addressSnapshot: { city: 'Azamgarh' },
        subtotal: 180,
        deliveryFee: 0,
        totalAmount: 180,
        status: OrderStatus.CANCELLED,
        paymentMethod: PaymentMethod.COD,
        items: {
          create: {
            sellerProductId: listing.id,
            productIdSnapshot: product.id,
            productNameSnapshot: product.name,
            unitPrice: 180,
            quantity: 1,
            totalAmount: 180,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces verified-purchase eligibility, concurrent duplicate guard, moderation, reporting, editing, and rating aggregation', async () => {
    // 1. Cancelled-order customer is ineligible (403)
    const c2Elig = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/reviews/eligibility`)
      .set('Authorization', `Bearer ${cust2Token}`)
      .expect(200);
    expect(c2Elig.body.eligible).toBe(false);

    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${cust2Token}`)
      .send({ productId, rating: 5, comment: 'Trying to review cancelled order' })
      .expect(403);

    // 2. Concurrent duplicate review submissions by eligible Customer 1 -> [201, 409]
    const [r1, r2] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${cust1Token}`)
        .send({ productId, rating: 5, title: 'Pure Honey', comment: 'Very fresh and pure!' }),
      request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${cust1Token}`)
        .send({ productId, rating: 5, title: 'Pure Honey', comment: 'Very fresh and pure!' }),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    const reviewId = (r1.status === 201 ? r1.body : r2.body).id;

    // 3. Pending review must NOT appear in public reviews or rating summary
    const pubBefore = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/reviews`)
      .expect(200);
    expect(pubBefore.body.summary.totalReviews).toBe(0);
    expect(pubBefore.body.summary.averageRating).toBe(0);
    expect(pubBefore.body.items).toHaveLength(0);

    // 4. Seller cannot approve/moderate review (403)
    await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${reviewId}/approve`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({})
      .expect(403);

    // 5. Admin approves review -> rating summary updates to 5.0 (1 review)
    const appRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${reviewId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
    expect(appRes.body.status).toBe(ReviewStatus.APPROVED);

    const pubAfterApprove = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/reviews`)
      .expect(200);
    expect(pubAfterApprove.body.summary.totalReviews).toBe(1);
    expect(pubAfterApprove.body.summary.averageRating).toBe(5);

    // 6. Customer 2 reports review (does NOT auto-hide); duplicate report blocked (409)
    await request(app.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${cust2Token}`)
      .send({ reason: ReviewReportReason.SPAM, explanation: 'Suspicious promo' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${cust2Token}`)
      .send({ reason: ReviewReportReason.SPAM })
      .expect(409);

    // 7. Cross-customer edit blocked (404)
    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${cust2Token}`)
      .send({ rating: 1 })
      .expect(404);

    // 8. Owner edits review to 4 stars -> moves back to PENDING & aggregate resets to 0
    const editRes = await request(app.getHttpServer())
      .patch(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({ rating: 4, comment: 'Updated: still very good!' })
      .expect(200);
    expect(editRes.body.status).toBe(ReviewStatus.PENDING);

    const sumAfterEdit = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/rating-summary`)
      .expect(200);
    expect(sumAfterEdit.body.totalReviews).toBe(0);

    // 9. Admin re-approves -> 4.0; hides -> 0; restores -> 4.0; customer deletes -> 0
    await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${reviewId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
    const sum4 = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/rating-summary`)
      .expect(200);
    expect(sum4.body.averageRating).toBe(4);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${reviewId}/hide`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Temporary hide' })
      .expect(200);
    const sumHidden = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/rating-summary`)
      .expect(200);
    expect(sumHidden.body.totalReviews).toBe(0);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${reviewId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    // Repeated approve on already APPROVED review is idempotent (no extra moderation log)
    const detailBeforeRepeat = await request(app.getHttpServer())
      .get(`/api/v1/admin/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const logCountBefore = detailBeforeRepeat.body.moderationLogs.length;

    await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${reviewId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    const detailAfterRepeat = await request(app.getHttpServer())
      .get(`/api/v1/admin/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detailAfterRepeat.body.moderationLogs).toHaveLength(logCountBefore);

    // Admin rating reconciliation matches APPROVED reviews
    const reconcileBeforeDelete = await request(app.getHttpServer())
      .post(`/api/v1/admin/products/${productId}/rating-reconcile`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(reconcileBeforeDelete.body.totalReviews).toBe(1);
    expect(reconcileBeforeDelete.body.averageRating).toBe(4);

    await request(app.getHttpServer())
      .delete(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${cust1Token}`)
      .expect(200);
    const sumDeleted = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/rating-summary`)
      .expect(200);
    expect(sumDeleted.body.totalReviews).toBe(0);

    // Customer-removed reviews cannot be re-published by admin
    await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${reviewId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(409);
  });
});
