import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  SellerProductStatus,
  SellerStatus,
  UserRoleType,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { hashDeliveryOtp } from '../src/modules/delivery/delivery-state-machine';

describe('Phase 14 — Delivery & Fulfillment (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const runId = crypto.randomUUID().slice(0, 8);
  let customerToken: string;
  let otherCustomerToken: string;
  let sellerToken: string;
  let otherSellerToken: string;
  let adminToken: string;
  let rider1Token: string;
  let rider2Token: string;
  let rider1PartnerId: string;
  let unverifiedPartnerId: string;
  let addressId: string;
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

    const [custRole, sellerRole, adminRole, riderRole] = await Promise.all([
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
      prisma.role.upsert({
        where: { name: 'DELIVERY_PARTNER' },
        update: {},
        create: {
          name: 'DELIVERY_PARTNER',
          roleType: UserRoleType.DELIVERY_PARTNER,
          description: 'Rider',
        },
      }),
    ]);

    const cust = await prisma.user.create({
      data: {
        name: `P14 Cust ${runId}`,
        email: `p14-cust-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: custRole.id } },
      },
    });
    customerToken = jwtService.sign(
      { sub: cust.id, email: cust.email, roles: ['CUSTOMER'] },
      { secret },
    );

    const otherCust = await prisma.user.create({
      data: {
        name: `P14 Other ${runId}`,
        email: `p14-other-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: custRole.id } },
      },
    });
    otherCustomerToken = jwtService.sign(
      { sub: otherCust.id, email: otherCust.email, roles: ['CUSTOMER'] },
      { secret },
    );

    const admin = await prisma.user.create({
      data: {
        name: `P14 Admin ${runId}`,
        email: `p14-admin-${runId}@test.com`,
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
        name: `P14 Seller ${runId}`,
        email: `p14-seller-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: sellerRole.id } },
      },
    });
    sellerToken = jwtService.sign(
      { sub: sellerOwner.id, email: sellerOwner.email, roles: ['SELLER'] },
      { secret },
    );

    const otherSellerOwner = await prisma.user.create({
      data: {
        name: `P14 Other Seller ${runId}`,
        email: `p14-oseller-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: sellerRole.id } },
      },
    });
    otherSellerToken = jwtService.sign(
      { sub: otherSellerOwner.id, email: otherSellerOwner.email, roles: ['SELLER'] },
      { secret },
    );

    await prisma.seller.create({
      data: {
        ownerUserId: otherSellerOwner.id,
        businessName: `P14 Other Store ${runId}`,
        slug: `p14-other-store-${runId}`,
        businessEmail: `p14-ostore-${runId}@test.com`,
        businessPhone: '9876543211',
        status: SellerStatus.APPROVED_ACTIVE,
      },
    });

    const seller = await prisma.seller.create({
      data: {
        ownerUserId: sellerOwner.id,
        businessName: `P14 Store ${runId}`,
        storeDisplayName: `P14 Fresh ${runId}`,
        slug: `p14-fresh-${runId}`,
        businessEmail: `p14-store-${runId}@test.com`,
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

    const rider1User = await prisma.user.create({
      data: {
        name: `P14 Rider1 ${runId}`,
        email: `p14-rider1-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: riderRole.id } },
      },
    });
    rider1Token = jwtService.sign(
      { sub: rider1User.id, email: rider1User.email, roles: ['DELIVERY_PARTNER'] },
      { secret },
    );
    const partner1 = await prisma.deliveryPartner.create({
      data: {
        userId: rider1User.id,
        vehicleType: 'SCOOTER',
        vehicleNumber: 'UP50AB1234',
        verificationStatus: VerificationStatus.VERIFIED,
        availabilityStatus: 'AVAILABLE',
      },
    });
    rider1PartnerId = partner1.id;

    const rider2User = await prisma.user.create({
      data: {
        name: `P14 Rider2 ${runId}`,
        email: `p14-rider2-${runId}@test.com`,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: riderRole.id } },
      },
    });
    rider2Token = jwtService.sign(
      { sub: rider2User.id, email: rider2User.email, roles: ['DELIVERY_PARTNER'] },
      { secret },
    );
    const unverifiedPartner = await prisma.deliveryPartner.create({
      data: {
        userId: rider2User.id,
        vehicleType: 'BIKE',
        verificationStatus: VerificationStatus.PENDING,
        availabilityStatus: 'AVAILABLE',
      },
    });
    unverifiedPartnerId = unverifiedPartner.id;

    const address = await prisma.customerAddress.create({
      data: {
        userId: cust.id,
        label: 'Home',
        recipientName: cust.name,
        phone: '9876543210',
        addressLine1: '123 Delivery Lane',
        city: 'Azamgarh',
        state: 'UP',
        postalCode: '276001',
        latitude: 26.07,
        longitude: 83.185,
        isDefault: true,
      },
    });
    addressId = address.id;

    const category = await prisma.category.create({
      data: { name: `P14 Cat ${runId}`, slug: `p14-cat-${runId}`, isActive: true },
    });
    const product = await prisma.product.create({
      data: {
        name: `P14 Milk ${runId}`,
        slug: `p14-milk-${runId}`,
        categoryId: category.id,
        status: ProductStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: '1L',
        packSize: '1L',
        sku: `P14-SKU-${runId}`,
        mrp: 100,
        isActive: true,
      },
    });
    const listing = await prisma.sellerProduct.create({
      data: {
        sellerId: seller.id,
        productId: product.id,
        variantId: variant.id,
        sellingPrice: 80,
        status: SellerProductStatus.ACTIVE,
      },
    });
    listingId = listing.id;

    await prisma.inventory.create({
      data: {
        sellerProductId: listing.id,
        stockOnHand: 20,
        reservedQuantity: 0,
        availableQuantity: 20,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('executes full COD delivery lifecycle with OTP & COD verification and enforces security boundaries', async () => {
    // 1. Place COD Order
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

    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        checkoutSessionId: prepRes.body.checkoutSessionId,
        paymentMethod: PaymentMethod.COD,
      })
      .expect(201);

    const orderId = orderRes.body.id;
    const orderTotal = Number(orderRes.body.totalAmount);

    // 2. Seller Accepts & Packs -> creates Delivery & marks READY_FOR_PICKUP
    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/pack`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    const delRecord = await prisma.delivery.findUniqueOrThrow({ where: { orderId } });
    expect(delRecord.status).toBe(DeliveryStatus.READY_FOR_PICKUP);

    // Set known OTP hash for deterministic E2E OTP verification
    const knownOtp = '4829';
    await prisma.delivery.update({
      where: { id: delRecord.id },
      data: { otpHash: hashDeliveryOtp(knownOtp, delRecord.id) },
    });

    // 3. Security: Unverified rider cannot be assigned (403)
    await request(app.getHttpServer())
      .post(`/api/v1/admin/deliveries/${delRecord.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deliveryPartnerId: unverifiedPartnerId })
      .expect(403);

    // Security: Customer cannot assign rider (403)
    await request(app.getHttpServer())
      .post(`/api/v1/admin/deliveries/${delRecord.id}/assign`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ deliveryPartnerId: rider1PartnerId })
      .expect(403);

    // 4. Admin assigns verified rider
    const assignRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/deliveries/${delRecord.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deliveryPartnerId: rider1PartnerId })
      .expect(200);
    expect(assignRes.body.status).toBe(DeliveryStatus.ASSIGNED);

    // Security: Other customer cannot view tracking (404); other seller cannot view delivery (404); other rider cannot accept (404)
    await request(app.getHttpServer())
      .get(`/api/v1/customer/orders/${orderId}/delivery/tracking`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/seller/deliveries/${delRecord.id}`)
      .set('Authorization', `Bearer ${otherSellerToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/delivery/assignments/${delRecord.id}`)
      .set('Authorization', `Bearer ${rider2Token}`)
      .expect(404);

    // 5. Rider accepts & picks up -> Order transitions to OUT_FOR_DELIVERY
    await request(app.getHttpServer())
      .post(`/api/v1/delivery/assignments/${delRecord.id}/accept`)
      .set('Authorization', `Bearer ${rider1Token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/delivery/assignments/${delRecord.id}/pickup`)
      .set('Authorization', `Bearer ${rider1Token}`)
      .expect(200);

    const orderInTransit = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(orderInTransit.status).toBe(OrderStatus.OUT_FOR_DELIVERY);

    // Reassignment after pickup must be blocked (409)
    await request(app.getHttpServer())
      .post(`/api/v1/admin/deliveries/${delRecord.id}/reassign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deliveryPartnerId: rider1PartnerId, reason: 'Invalid post-pickup reassign' })
      .expect(409);

    // 6. Invalid OTP rejected (400)
    await request(app.getHttpServer())
      .post(`/api/v1/delivery/assignments/${delRecord.id}/complete`)
      .set('Authorization', `Bearer ${rider1Token}`)
      .send({ otp: '9999', codCollected: true, codCollectedAmount: orderTotal })
      .expect(400);

    // 7. Valid OTP + COD collection completes delivery & order
    const completeRes = await request(app.getHttpServer())
      .post(`/api/v1/delivery/assignments/${delRecord.id}/complete`)
      .set('Authorization', `Bearer ${rider1Token}`)
      .send({ otp: knownOtp, codCollected: true, codCollectedAmount: orderTotal })
      .expect(200);

    expect(completeRes.body.status).toBe(DeliveryStatus.DELIVERED);
    expect(completeRes.body.codCollected).toBe(true);

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(finalOrder.status).toBe(OrderStatus.DELIVERED);
    expect(finalOrder.paymentStatus).toBe(PaymentStatus.SUCCESS);

    // Duplicate completion is idempotent (200)
    await request(app.getHttpServer())
      .post(`/api/v1/delivery/assignments/${delRecord.id}/complete`)
      .set('Authorization', `Bearer ${rider1Token}`)
      .send({ otp: knownOtp, codCollected: true, codCollectedAmount: orderTotal })
      .expect(200);
  });

  it('handles failed delivery attempts and escalates to FAILED order on max attempts', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ sellerProductId: listingId, quantity: 1 })
      .expect(200);

    const prepRes = await request(app.getHttpServer())
      .post('/api/v1/checkout/prepare')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId })
      .expect(200);

    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        checkoutSessionId: prepRes.body.checkoutSessionId,
        paymentMethod: PaymentMethod.COD,
      })
      .expect(201);

    const orderId = orderRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/seller/orders/${orderId}/pack`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    const del = await prisma.delivery.update({
      where: { orderId },
      data: { maxAttempts: 1 },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/admin/deliveries/${del.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deliveryPartnerId: rider1PartnerId })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/delivery/assignments/${del.id}/accept`)
      .set('Authorization', `Bearer ${rider1Token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/delivery/assignments/${del.id}/pickup`)
      .set('Authorization', `Bearer ${rider1Token}`)
      .expect(200);

    const failRes = await request(app.getHttpServer())
      .post(`/api/v1/delivery/assignments/${del.id}/fail`)
      .set('Authorization', `Bearer ${rider1Token}`)
      .send({ reason: 'CUSTOMER_UNAVAILABLE', note: 'Phone switched off' })
      .expect(200);

    expect(failRes.body.status).toBe(DeliveryStatus.FAILED);
    expect(failRes.body.attemptCount).toBe(1);

    const orderAfterFail = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(orderAfterFail.status).toBe(OrderStatus.FAILED);
    expect(orderAfterFail.deliveryStatus).toBe(DeliveryStatus.FAILED);
  });
});
