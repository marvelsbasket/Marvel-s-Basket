import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  DiscountType,
  PaymentMethod,
  ProductStatus,
  SellerDiscountStatus,
  SellerProductStatus,
  SellerStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Phase 15 — Seller Discounts & Concurrent Coupons (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const runId = crypto.randomUUID().slice(0, 8);
  let cust1Token: string;
  let cust2Token: string;
  let seller1Token: string;
  let seller2Token: string;
  let adminToken: string;
  let addr1Id: string;
  let addr2Id: string;
  let listingId: string;

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
        name: `P15 Cust1 ${runId}`,
        email: `p15-c1-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: custRole.id } },
      },
    });
    cust1Token = jwtService.sign({ sub: c1.id, email: c1.email, roles: ['CUSTOMER'] }, { secret });

    const c2 = await prisma.user.create({
      data: {
        name: `P15 Cust2 ${runId}`,
        email: `p15-c2-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: custRole.id } },
      },
    });
    cust2Token = jwtService.sign({ sub: c2.id, email: c2.email, roles: ['CUSTOMER'] }, { secret });

    const admin = await prisma.user.create({
      data: {
        name: `P15 Admin ${runId}`,
        email: `p15-admin-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: adminRole.id } },
      },
    });
    adminToken = jwtService.sign(
      { sub: admin.id, email: admin.email, roles: ['ADMIN'] },
      { secret },
    );

    const s1Owner = await prisma.user.create({
      data: {
        name: `P15 Seller1 ${runId}`,
        email: `p15-s1-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: sellerRole.id } },
      },
    });
    seller1Token = jwtService.sign(
      { sub: s1Owner.id, email: s1Owner.email, roles: ['SELLER'] },
      { secret },
    );

    const s2Owner = await prisma.user.create({
      data: {
        name: `P15 Seller2 ${runId}`,
        email: `p15-s2-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: sellerRole.id } },
      },
    });
    seller2Token = jwtService.sign(
      { sub: s2Owner.id, email: s2Owner.email, roles: ['SELLER'] },
      { secret },
    );

    await prisma.seller.create({
      data: {
        ownerUserId: s2Owner.id,
        businessName: `P15 Store2 ${runId}`,
        slug: `p15-store2-${runId}`,
        businessEmail: `p15-store2-${runId}@test.com`,
        businessPhone: '9876543211',
        status: SellerStatus.APPROVED_ACTIVE,
      },
    });

    const seller1 = await prisma.seller.create({
      data: {
        ownerUserId: s1Owner.id,
        businessName: `P15 Store1 ${runId}`,
        storeDisplayName: `P15 Fresh1 ${runId}`,
        slug: `p15-fresh1-${runId}`,
        businessEmail: `p15-store1-${runId}@test.com`,
        businessPhone: '9876543210',
        status: SellerStatus.APPROVED_ACTIVE,
        profile: {
          create: {
            addressLine1: '100 Market St',
            city: 'Azamgarh',
            state: 'UP',
            postalCode: '276001',
            latitude: 26.0685,
            longitude: 83.1836,
            serviceRadiusKm: 10,
            openingTime: '00:00',
            closingTime: '23:59',
          },
        },
        businessHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            dayOfWeek,
            openingTime: '00:00',
            closingTime: '23:59',
            isClosed: false,
          })),
        },
      },
    });

    const a1 = await prisma.customerAddress.create({
      data: {
        userId: c1.id,
        label: 'Home',
        recipientName: c1.name,
        phone: '9876543210',
        addressLine1: '123 Road',
        city: 'Azamgarh',
        state: 'UP',
        postalCode: '276001',
        latitude: 26.07,
        longitude: 83.185,
        isDefault: true,
      },
    });
    addr1Id = a1.id;

    const a2 = await prisma.customerAddress.create({
      data: {
        userId: c2.id,
        label: 'Home',
        recipientName: c2.name,
        phone: '9876543212',
        addressLine1: '124 Road',
        city: 'Azamgarh',
        state: 'UP',
        postalCode: '276001',
        latitude: 26.07,
        longitude: 83.185,
        isDefault: true,
      },
    });
    addr2Id = a2.id;

    const category = await prisma.category.create({
      data: { name: `P15 Cat ${runId}`, slug: `p15-cat-${runId}`, isActive: true },
    });
    const product = await prisma.product.create({
      data: {
        name: `P15 Ghee ${runId}`,
        slug: `p15-ghee-${runId}`,
        categoryId: category.id,
        status: ProductStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: '500ml',
        packSize: '500ml',
        sku: `P15-SKU-${runId}`,
        mrp: 500,
        isActive: true,
      },
    });
    const listing = await prisma.sellerProduct.create({
      data: {
        sellerId: seller1.id,
        productId: product.id,
        variantId: variant.id,
        sellingPrice: 400,
        status: SellerProductStatus.ACTIVE,
      },
    });
    listingId = listing.id;

    await prisma.inventory.create({
      data: {
        sellerProductId: listing.id,
        stockOnHand: 30,
        reservedQuantity: 0,
        availableQuantity: 30,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates seller discount, isolates cross-seller access, applies in checkout, and preserves order snapshot', async () => {
    const now = new Date();
    const later = new Date(now.getTime() + 86400000);

    // 1. Cross-seller discount creation blocked (404)
    await request(app.getHttpServer())
      .post('/api/v1/seller/discounts')
      .set('Authorization', `Bearer ${seller2Token}`)
      .send({
        sellerProductId: listingId,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        startsAt: now.toISOString(),
        expiresAt: later.toISOString(),
      })
      .expect(404);

    // 2. Seller 1 creates 25% discount (400 -> 300)
    const discRes = await request(app.getHttpServer())
      .post('/api/v1/seller/discounts')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        sellerProductId: listingId,
        title: 'Fresh 25% Off',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 25,
        startsAt: now.toISOString(),
        expiresAt: later.toISOString(),
      })
      .expect(201);

    const discountId = discRes.body.id;
    expect(discRes.body.status).toBe(SellerDiscountStatus.ACTIVE);
    expect(discRes.body.effectiveSellingPrice).toBe(300);

    // 3. Basket & Checkout reflect discounted price (300)
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({ sellerProductId: listingId, quantity: 1 })
      .expect(200);

    const cartRes = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${cust1Token}`)
      .expect(200);
    expect(cartRes.body.items[0].unitPrice).toBe(300);

    const prepRes = await request(app.getHttpServer())
      .post('/api/v1/checkout/prepare')
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({ addressId: addr1Id })
      .expect(200);
    expect(prepRes.body.priceBreakdown.itemSubtotal).toBe(300);

    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({
        checkoutSessionId: prepRes.body.checkoutSessionId,
        paymentMethod: PaymentMethod.COD,
      })
      .expect(201);

    // 4. Seller pauses discount -> existing OrderItem retains 300 snapshot
    await request(app.getHttpServer())
      .post(`/api/v1/seller/discounts/${discountId}/pause`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .expect(200);

    const orderItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: orderRes.body.id },
    });
    expect(Number(orderItem.unitPrice)).toBe(300);

    await request(app.getHttpServer())
      .post(`/api/v1/seller/discounts/${discountId}/end`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .expect(200);
  });

  it('prevents exceeding coupon usageLimit under concurrent checkouts', async () => {
    const code = `RACE${runId.toUpperCase()}`;
    const now = new Date();
    const later = new Date(now.getTime() + 86400000);

    // Admin creates coupon with usageLimit = 1
    const couponRes = await request(app.getHttpServer())
      .post('/api/v1/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code,
        description: 'Single-use race test coupon',
        discountType: DiscountType.FLAT,
        discountValue: 50,
        minimumOrderAmount: 100,
        usageLimit: 1,
        perUserLimit: 1,
        startsAt: now.toISOString(),
        expiresAt: later.toISOString(),
      })
      .expect(201);

    const couponId = couponRes.body.id;

    // Customer 1 & Customer 2 both prepare checkout with the coupon
    for (const [token, addrId] of [
      [cust1Token, addr1Id],
      [cust2Token, addr2Id],
    ] as const) {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ sellerProductId: listingId, quantity: 1 })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${token}`)
        .send({ code })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/checkout/prepare')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: addrId })
        .expect(200);
    }

    const sessions = await prisma.checkoutSession.findMany({
      where: { couponId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    expect(sessions.length).toBe(2);

    // Fire both order creations concurrently
    const [r1, r2] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${cust1Token}`)
        .send({
          checkoutSessionId: sessions.find((s) => s.addressId === addr1Id)!.id,
          paymentMethod: PaymentMethod.COD,
        }),
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${cust2Token}`)
        .send({
          checkoutSessionId: sessions.find((s) => s.addressId === addr2Id)!.id,
          paymentMethod: PaymentMethod.COD,
        }),
    ]);

    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const finalCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } });
    expect(finalCoupon.currentUsageCount).toBe(1);
  });
});
