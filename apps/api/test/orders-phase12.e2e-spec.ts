import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  OrderStatus,
  ProductStatus,
  SellerProductStatus,
  SellerStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Phase 12 Order Management (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const runId = crypto.randomUUID().slice(0, 8);
  let customerId: string;
  let customerToken: string;
  let otherCustomerToken: string;
  let seller1OwnerToken: string;
  let seller2OwnerToken: string;
  let adminToken: string;
  let addressId: string;
  let listingId: string;
  let invId: string;

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

    const cust = await prisma.user.create({
      data: {
        email: `p12-cust-${runId}@test.local`,
        name: 'P12 Customer',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: custRole.id } },
      },
    });
    customerId = cust.id;
    customerToken = jwtService.sign(
      { sub: cust.id, email: cust.email, roles: ['CUSTOMER'] },
      { secret },
    );

    const otherCust = await prisma.user.create({
      data: {
        email: `p12-other-${runId}@test.local`,
        name: 'P12 Other Customer',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: custRole.id } },
      },
    });
    otherCustomerToken = jwtService.sign(
      { sub: otherCust.id, email: otherCust.email, roles: ['CUSTOMER'] },
      { secret },
    );

    const adminUser = await prisma.user.create({
      data: {
        email: `p12-admin-${runId}@test.local`,
        name: 'P12 Admin',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: adminRole.id } },
      },
    });
    adminToken = jwtService.sign(
      { sub: adminUser.id, email: adminUser.email, roles: ['ADMIN'] },
      { secret },
    );

    const addr = await prisma.customerAddress.create({
      data: {
        userId: customerId,
        label: 'Home',
        recipientName: 'Original Recipient',
        phone: '9876543210',
        addressLine1: '10 Original St',
        city: 'Azamgarh',
        state: 'UP',
        postalCode: '276001',
        latitude: 26.065,
        longitude: 83.185,
        isDefault: true,
      },
    });
    addressId = addr.id;

    const s1Owner = await prisma.user.create({
      data: {
        email: `p12-s1-${runId}@test.local`,
        name: 'P12 Seller 1',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: sellerRole.id } },
      },
    });
    seller1OwnerToken = jwtService.sign(
      { sub: s1Owner.id, email: s1Owner.email, roles: ['SELLER'] },
      { secret },
    );

    const seller1 = await prisma.seller.create({
      data: {
        ownerUserId: s1Owner.id,
        businessName: `P12 Store 1 ${runId}`,
        storeDisplayName: `P12 Store 1 ${runId}`,
        slug: `p12-store-1-${runId}`,
        businessEmail: `s1-${runId}@test.local`,
        businessPhone: '9876500011',
        status: SellerStatus.APPROVED_ACTIVE,
        profile: {
          create: {
            addressLine1: 'Market',
            city: 'Azamgarh',
            state: 'UP',
            postalCode: '276001',
            latitude: 26.06,
            longitude: 83.18,
            serviceRadiusKm: 5,
            openingTime: '00:00',
            closingTime: '23:59',
          },
        },
      },
    });

    const s2Owner = await prisma.user.create({
      data: {
        email: `p12-s2-${runId}@test.local`,
        name: 'P12 Seller 2',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: sellerRole.id } },
      },
    });
    seller2OwnerToken = jwtService.sign(
      { sub: s2Owner.id, email: s2Owner.email, roles: ['SELLER'] },
      { secret },
    );

    await prisma.seller.create({
      data: {
        ownerUserId: s2Owner.id,
        businessName: `P12 Store 2 ${runId}`,
        storeDisplayName: `P12 Store 2 ${runId}`,
        slug: `p12-store-2-${runId}`,
        businessEmail: `s2-${runId}@test.local`,
        businessPhone: '9876500012',
        status: SellerStatus.APPROVED_ACTIVE,
      },
    });

    const category = await prisma.category.create({
      data: { name: `P12 Cat ${runId}`, slug: `p12-cat-${runId}` },
    });
    const product = await prisma.product.create({
      data: {
        name: `P12 Paneer ${runId}`,
        slug: `p12-paneer-${runId}`,
        brand: 'Amul',
        categoryId: category.id,
        status: ProductStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: '200g',
        packSize: '200g',
        sku: `P12-SKU-${runId}`,
        mrp: 250,
        isActive: true,
      },
    });

    const sp = await prisma.sellerProduct.create({
      data: {
        sellerId: seller1.id,
        productId: product.id,
        variantId: variant.id,
        sellingPrice: 200,
        mrp: 250,
        status: SellerProductStatus.ACTIVE,
        inventory: {
          create: { stockOnHand: 10, availableQuantity: 10, reservedQuantity: 0 },
        },
      },
      include: { inventory: true },
    });
    listingId = sp.id;
    invId = sp.inventory!.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  async function prepareCheckoutSession(): Promise<string> {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ sellerProductId: listingId, quantity: 2 })
      .expect(200);

    const prepRes = await request(app.getHttpServer())
      .post('/api/v1/checkout/prepare')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId })
      .expect(200);

    return prepRes.body.checkoutSessionId;
  }

  it('creates order idempotently, preserves immutable snapshots, enforces RBAC & lifecycle, and handles complaints', async () => {
    const sessionId = await prepareCheckoutSession();

    // 1. Place order (COD)
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        checkoutSessionId: sessionId,
        paymentMethod: 'COD',
        idempotencyKey: `idemp-${sessionId}`,
      })
      .expect(201);

    const orderId = createRes.body.id;
    expect(createRes.body.status).toBe('PENDING');
    expect(createRes.body.items[0].unitPrice).toBe(200);
    expect(createRes.body.addressSnapshot.recipientName).toBe('Original Recipient');

    // Duplicate retry returns same order without deducting stock again
    const dupRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        checkoutSessionId: sessionId,
        paymentMethod: 'COD',
        idempotencyKey: `idemp-${sessionId}`,
      })
      .expect(201);
    expect(dupRes.body.id).toBe(orderId);

    const invAfterOrder = await prisma.inventory.findUnique({ where: { id: invId } });
    expect(invAfterOrder?.stockOnHand).toBe(8);
    expect(invAfterOrder?.reservedQuantity).toBe(0);
    expect(invAfterOrder?.availableQuantity).toBe(8);

    // 2. Snapshot immutability: mutate seller price & saved address AFTER purchase
    await prisma.sellerProduct.update({ where: { id: listingId }, data: { sellingPrice: 240 } });
    await prisma.customerAddress.update({
      where: { id: addressId },
      data: { recipientName: 'Mutated Recipient' },
    });

    const detailAfterMutation = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(detailAfterMutation.body.items[0].unitPrice).toBe(200);
    expect(detailAfterMutation.body.addressSnapshot.recipientName).toBe('Original Recipient');

    // 3. Authorization & State Machine checks
    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${seller2OwnerToken}`)
      .expect(404);

    // Invalid jump PENDING -> PACKED
    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/pack`)
      .set('Authorization', `Bearer ${seller1OwnerToken}`)
      .expect(400);

    // Valid seller fulfillment: accept -> pack -> dispatch
    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${seller1OwnerToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/pack`)
      .set('Authorization', `Bearer ${seller1OwnerToken}`)
      .expect(200);

    // Post-pack customer cancellation is blocked
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Too late' })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/dispatch`)
      .set('Authorization', `Bearer ${seller1OwnerToken}`)
      .expect(200);

    // Admin marks delivered
    await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${orderId}/intervene`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetStatus: OrderStatus.DELIVERED, reason: 'Delivered in E2E test' })
      .expect(200);

    // 4. Complaint submission & admin review
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/complaints`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ category: 'MISSING_ITEM', description: 'Unauthorized complaint test' })
      .expect(404);

    const compRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/complaints`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ category: 'MISSING_ITEM', description: 'One pack was missing from the bag' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/complaints/${compRes.body.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED', adminNote: 'Verified and resolved' })
      .expect(200);
  });

  it('restores stock exactly once on idempotent pre-pack customer cancellation', async () => {
    const sessionId = await prepareCheckoutSession();
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ checkoutSessionId: sessionId, paymentMethod: 'COD' })
      .expect(201);

    const orderId = orderRes.body.id;
    const invBeforeCancel = await prisma.inventory.findUnique({ where: { id: invId } });
    expect(invBeforeCancel?.stockOnHand).toBe(6);

    // Cancel twice -> stock restored only once (6 -> 8)
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Ordered by mistake' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Retry cancel' })
      .expect(200);

    const invAfterCancel = await prisma.inventory.findUnique({ where: { id: invId } });
    expect(invAfterCancel?.stockOnHand).toBe(8);
    expect(invAfterCancel?.availableQuantity).toBe(8);
  });
});
