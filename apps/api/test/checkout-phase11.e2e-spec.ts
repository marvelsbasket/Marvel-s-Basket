import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { InventoryReservationService } from '../src/modules/inventory/services/inventory-reservation.service';
import {
  CheckoutSessionStatus,
  DiscountType,
  ProductStatus,
  SellerProductStatus,
  SellerStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Phase 11 Cart, Checkout & Concurrency (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reservationService: InventoryReservationService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const testRunId = crypto.randomUUID().slice(0, 8);
  let customerAId: string;
  let customerAToken: string;
  let customerBId: string;
  let customerBToken: string;
  let addressAId: string;
  let addressBId: string;
  let store1Id: string;
  let store2Id: string;
  let listing1Id: string;
  let listing2Id: string;
  let inv1Id: string;
  let inv2Id: string;
  let couponCode: string;

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
    reservationService = app.get(InventoryReservationService);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);

    const customerRole = await prisma.role.upsert({
      where: { name: 'CUSTOMER' },
      update: {},
      create: { name: 'CUSTOMER', roleType: UserRoleType.CUSTOMER, description: 'Customer' },
    });

    // Create 2 customers + addresses
    const custA = await prisma.user.create({
      data: {
        email: `p11-a-${testRunId}@test.local`,
        name: 'Phase11 Customer A',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: customerRole.id } },
      },
    });
    customerAId = custA.id;
    customerAToken = jwtService.sign(
      { sub: custA.id, email: custA.email, roles: ['CUSTOMER'] },
      { secret: configService.get<string>('jwt.accessSecret') },
    );

    const custB = await prisma.user.create({
      data: {
        email: `p11-b-${testRunId}@test.local`,
        name: 'Phase11 Customer B',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: customerRole.id } },
      },
    });
    customerBId = custB.id;
    customerBToken = jwtService.sign(
      { sub: custB.id, email: custB.email, roles: ['CUSTOMER'] },
      { secret: configService.get<string>('jwt.accessSecret') },
    );

    const addrA = await prisma.customerAddress.create({
      data: {
        userId: customerAId,
        label: 'Home',
        recipientName: 'Cust A',
        phone: '9876543210',
        addressLine1: '10 Civil Lines',
        city: 'Azamgarh',
        state: 'UP',
        postalCode: '276001',
        latitude: 26.065,
        longitude: 83.185,
        isDefault: true,
      },
    });
    addressAId = addrA.id;

    const addrB = await prisma.customerAddress.create({
      data: {
        userId: customerBId,
        label: 'Home',
        recipientName: 'Cust B',
        phone: '9876543211',
        addressLine1: '11 Civil Lines',
        city: 'Azamgarh',
        state: 'UP',
        postalCode: '276001',
        latitude: 26.065,
        longitude: 83.185,
        isDefault: true,
      },
    });
    addressBId = addrB.id;

    // Create 2 sellers (open 24x7 for deterministic test)
    const sellerOwner1 = await prisma.user.create({
      data: {
        email: `p11-s1-${testRunId}@test.local`,
        name: 'Seller 1',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    const seller1 = await prisma.seller.create({
      data: {
        ownerUserId: sellerOwner1.id,
        businessName: `Store One ${testRunId}`,
        storeDisplayName: `Store One ${testRunId}`,
        slug: `store-one-${testRunId}`,
        businessEmail: `s1-${testRunId}@test.local`,
        businessPhone: '9876500001',
        status: SellerStatus.APPROVED_ACTIVE,
        profile: {
          create: {
            addressLine1: 'Market Road',
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
    store1Id = seller1.id;

    const sellerOwner2 = await prisma.user.create({
      data: {
        email: `p11-s2-${testRunId}@test.local`,
        name: 'Seller 2',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    const seller2 = await prisma.seller.create({
      data: {
        ownerUserId: sellerOwner2.id,
        businessName: `Store Two ${testRunId}`,
        storeDisplayName: `Store Two ${testRunId}`,
        slug: `store-two-${testRunId}`,
        businessEmail: `s2-${testRunId}@test.local`,
        businessPhone: '9876500002',
        status: SellerStatus.APPROVED_ACTIVE,
        profile: {
          create: {
            addressLine1: 'Station Road',
            city: 'Azamgarh',
            state: 'UP',
            postalCode: '276001',
            latitude: 26.062,
            longitude: 83.182,
            serviceRadiusKm: 5,
            openingTime: '00:00',
            closingTime: '23:59',
          },
        },
      },
    });
    store2Id = seller2.id;

    // Create master category + product + variant
    const category = await prisma.category.create({
      data: { name: `Cat ${testRunId}`, slug: `cat-${testRunId}` },
    });
    const product = await prisma.product.create({
      data: {
        name: `Test Rice ${testRunId}`,
        slug: `test-rice-${testRunId}`,
        categoryId: category.id,
        status: ProductStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: '5 kg',
        packSize: '5 kg',
        sku: `SKU-P11-${testRunId}`,
        mrp: 350,
        isActive: true,
      },
    });

    const sp1 = await prisma.sellerProduct.create({
      data: {
        sellerId: store1Id,
        productId: product.id,
        variantId: variant.id,
        sellingPrice: 300,
        mrp: 350,
        status: SellerProductStatus.ACTIVE,
        inventory: {
          create: { stockOnHand: 1, availableQuantity: 1, reservedQuantity: 0 },
        },
      },
      include: { inventory: true },
    });
    listing1Id = sp1.id;
    inv1Id = sp1.inventory!.id;

    const sp2 = await prisma.sellerProduct.create({
      data: {
        sellerId: store2Id,
        productId: product.id,
        variantId: variant.id,
        sellingPrice: 310,
        mrp: 350,
        status: SellerProductStatus.ACTIVE,
        inventory: {
          create: { stockOnHand: 5, availableQuantity: 5, reservedQuantity: 0 },
        },
      },
      include: { inventory: true },
    });
    listing2Id = sp2.id;
    inv2Id = sp2.inventory!.id;

    couponCode = `P11SAVE${testRunId.toUpperCase()}`;
    await prisma.coupon.create({
      data: {
        code: couponCode,
        description: 'Flat ₹50 off',
        discountType: DiscountType.FLAT,
        discountValue: 50,
        minimumOrderAmount: 200,
        maximumDiscount: 50,
        usageLimit: 100,
        perUserLimit: 1,
        startsAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.stockReservation.deleteMany({
      where: { inventoryId: { in: [inv1Id, inv2Id].filter(Boolean) } },
    });
    await prisma.checkoutSession.deleteMany({
      where: { userId: { in: [customerAId, customerBId].filter(Boolean) } },
    });
    await prisma.cart.deleteMany({
      where: { userId: { in: [customerAId, customerBId].filter(Boolean) } },
    });
    await app.close();
  });

  it('enforces single-store cart, store-switch confirmation, and coupon application', async () => {
    // 1. Add from Store 1
    const addRes = await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ sellerProductId: listing1Id, quantity: 1 })
      .expect(200);
    expect(addRes.body.sellerId).toBe(store1Id);

    // 2. Attempt add from Store 2 -> 409 STORE_SWITCH_REQUIRED
    const conflictRes = await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ sellerProductId: listing2Id, quantity: 1 })
      .expect(409);
    expect(conflictRes.body.code).toBe('STORE_SWITCH_REQUIRED');

    // 3. Confirm switch via /cart/switch-store
    const switchRes = await request(app.getHttpServer())
      .post('/api/v1/cart/switch-store')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ sellerProductId: listing2Id, quantity: 1 })
      .expect(200);
    expect(switchRes.body.sellerId).toBe(store2Id);
    expect(switchRes.body.items).toHaveLength(1);

    // 4. Apply coupon
    const couponRes = await request(app.getHttpServer())
      .post('/api/v1/cart/coupon')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ code: couponCode })
      .expect(200);
    expect(couponRes.body.appliedCouponCode).toBe(couponCode);
    expect(couponRes.body.couponDiscount).toBe(50);
  });

  it('prepares checkout with 15m reservation, reuses on summary/refresh, and releases on cancel', async () => {
    const prepRes = await request(app.getHttpServer())
      .post('/api/v1/checkout/prepare')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ addressId: addressAId })
      .expect(200);

    const sessionId = prepRes.body.checkoutSessionId;
    expect(prepRes.body.status).toBe('RESERVATION_ACTIVE');
    expect(prepRes.body.remainingSeconds).toBeGreaterThan(800);
    expect(prepRes.body.priceBreakdown.couponDiscount).toBe(50);

    // Summary returns same session without duplicate reservation
    const summaryRes = await request(app.getHttpServer())
      .get('/api/v1/checkout/summary')
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(200);
    expect(summaryRes.body.checkoutSessionId).toBe(sessionId);

    const invAfterPrep = await prisma.inventory.findUnique({ where: { id: inv2Id } });
    expect(invAfterPrep?.reservedQuantity).toBe(1);
    expect(invAfterPrep?.availableQuantity).toBe(4);

    // Cancel releases immediately
    await request(app.getHttpServer())
      .post('/api/v1/checkout/cancel')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ checkoutSessionId: sessionId })
      .expect(200);

    const invAfterCancel = await prisma.inventory.findUnique({ where: { id: inv2Id } });
    expect(invAfterCancel?.reservedQuantity).toBe(0);
    expect(invAfterCancel?.availableQuantity).toBe(5);
  });

  it('CRITICAL CONCURRENCY: only 1 of 2 customers wins the final unit of stock', async () => {
    // Clear both carts and add listing1 (stockOnHand = 1) to both
    await request(app.getHttpServer())
      .delete('/api/v1/cart')
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ sellerProductId: listing1Id, quantity: 1 })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ sellerProductId: listing1Id, quantity: 1 })
      .expect(200);

    // Race both checkout preparations simultaneously
    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/checkout/prepare')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ addressId: addressAId }),
      request(app.getHttpServer())
        .post('/api/v1/checkout/prepare')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ addressId: addressBId }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const inv1 = await prisma.inventory.findUnique({ where: { id: inv1Id } });
    expect(inv1?.stockOnHand).toBe(1);
    expect(inv1?.reservedQuantity).toBe(1);
    expect(inv1?.availableQuantity).toBe(0);

    // Verify expired reservation recovery & commit rejection
    const winnerSessionId =
      resA.status === 200 ? resA.body.checkoutSessionId : resB.body.checkoutSessionId;
    await prisma.stockReservation.updateMany({
      where: { checkoutSessionId: winnerSessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await prisma.checkoutSession.update({
      where: { id: winnerSessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    // Attempting to commit an expired reservation must fail
    await expect(
      reservationService.commitReservation({
        checkoutSessionId: winnerSessionId,
        idempotencyKey: `commit-${winnerSessionId}`,
      }),
    ).rejects.toThrow();

    // Recovery sweep releases the expired reservation
    const sweep = await reservationService.expireSessionReservation(winnerSessionId);
    expect(sweep.releasedCount).toBe(1);

    const inv1Restored = await prisma.inventory.findUnique({ where: { id: inv1Id } });
    expect(inv1Restored?.reservedQuantity).toBe(0);
    expect(inv1Restored?.availableQuantity).toBe(1);

    const sessionAfterSweep = await prisma.checkoutSession.findUnique({
      where: { id: winnerSessionId },
    });
    expect(sessionAfterSweep?.status).toBe(CheckoutSessionStatus.EXPIRED);
  });
});
