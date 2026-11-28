import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as express from 'express';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  SellerProductStatus,
  SellerStatus,
  StockReservationStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { RazorpayService } from '../src/modules/payments/gateways/razorpay/razorpay.service';

describe('Phase 13 — Razorpay Payments & Security (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const runId = crypto.randomUUID().slice(0, 8);
  const testKeySecret = 'rzp_test_e2e_secret_key_123456';
  const testWebhookSecret = 'whsec_test_e2e_secret_123456';

  let customerId: string;
  let customerToken: string;
  let otherCustomerToken: string;
  let adminToken: string;
  let addressId: string;
  let listingId: string;
  let invId: string;

  const mockRazorpayService = {
    getPublicKeyId: () => 'rzp_test_e2e_key_id',
    getMode: () => 'test' as const,
    getCaptureMode: () => 'automatic' as const,
    isConfigured: () => true,
    createOrder: jest.fn(async (params: { amountPaise: number; receipt: string }) => ({
      id: `order_rzp_${crypto.randomBytes(6).toString('hex')}`,
      entity: 'order',
      amount: params.amountPaise,
      amount_paid: 0,
      amount_due: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt,
      status: 'created',
      attempts: 0,
      created_at: Math.floor(Date.now() / 1000),
    })),
    fetchOrderPayments: jest.fn(async () => []),
    fetchPayment: jest.fn(async (paymentId: string) => ({
      id: paymentId,
      entity: 'payment',
      amount: 0,
      currency: 'INR',
      status: 'captured',
      order_id: '',
      method: 'upi',
      amount_refunded: 0,
      refund_status: null,
      captured: true,
      created_at: Math.floor(Date.now() / 1000),
    })),
    createRefund: jest.fn(async (paymentId: string, params: { amount?: number }) => ({
      id: `rfnd_${crypto.randomBytes(6).toString('hex')}`,
      entity: 'refund',
      amount: params.amount || 0,
      currency: 'INR',
      payment_id: paymentId,
      status: 'processed',
      speed_requested: 'normal',
      speed_processed: 'normal',
      created_at: Math.floor(Date.now() / 1000),
    })),
  };

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RazorpayService)
      .useValue(mockRazorpayService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(
      express.json({
        limit: '10mb',
        verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
          if (req.originalUrl?.includes('/payments/webhooks/razorpay')) {
            req.rawBody = buf;
          }
        },
      }),
    );
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
        name: `P13 Cust ${runId}`,
        email: `p13-cust-${runId}@test.com`,
        passwordHash: 'hash',
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
        name: `P13 Other ${runId}`,
        email: `p13-other-${runId}@test.com`,
        passwordHash: 'hash',
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
        name: `P13 Admin ${runId}`,
        email: `p13-admin-${runId}@test.com`,
        passwordHash: 'hash',
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
        name: `P13 Seller ${runId}`,
        email: `p13-seller-${runId}@test.com`,
        passwordHash: 'hash',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: sellerRole.id } },
      },
    });

    const seller = await prisma.seller.create({
      data: {
        ownerUserId: sellerOwner.id,
        businessName: `P13 Store ${runId}`,
        storeDisplayName: `P13 Fresh ${runId}`,
        slug: `p13-fresh-${runId}`,
        businessEmail: `p13-store-${runId}@test.com`,
        businessPhone: '9876543210',
        status: SellerStatus.APPROVED_ACTIVE,
        profile: {
          create: {
            addressLine1: '456 Store Market',
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

    const address = await prisma.customerAddress.create({
      data: {
        userId: cust.id,
        label: 'Home',
        recipientName: cust.name,
        phone: '9876543210',
        addressLine1: '123 Test Road',
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
      data: { name: `P13 Cat ${runId}`, slug: `p13-cat-${runId}`, isActive: true },
    });
    const product = await prisma.product.create({
      data: {
        name: `P13 Butter ${runId}`,
        slug: `p13-butter-${runId}`,
        categoryId: category.id,
        status: ProductStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: '500g',
        packSize: '500g',
        sku: `P13-SKU-${runId}`,
        mrp: 300,
        isActive: true,
      },
    });
    const listing = await prisma.sellerProduct.create({
      data: {
        sellerId: seller.id,
        productId: product.id,
        variantId: variant.id,
        sellingPrice: 250,
        status: SellerProductStatus.ACTIVE,
      },
    });
    listingId = listing.id;

    const inv = await prisma.inventory.create({
      data: {
        sellerProductId: listing.id,
        stockOnHand: 10,
        reservedQuantity: 0,
        availableQuantity: 10,
      },
    });
    invId = inv.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('completes full Razorpay initiation, signature verification, stock commit, and admin refund', async () => {
    // 1. Add to cart & prepare checkout
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

    const checkoutSessionId = prepRes.body.checkoutSessionId;

    // 2. Reject direct POST /orders with RAZORPAY
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ checkoutSessionId, paymentMethod: 'RAZORPAY' })
      .expect(400);

    // 3. Initiate payment
    const initRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ checkoutSessionId })
      .expect(200);

    const { paymentId, orderId, amountPaise, checkout } = initRes.body;
    expect(checkout.orderId).toMatch(/^order_rzp_/);
    expect(amountPaise).toBeGreaterThan(0);

    // 4. Cross-customer access must be blocked (404)
    await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}/status`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(404);

    // 5. Invalid signature must be rejected (400)
    await request(app.getHttpServer())
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        razorpayOrderId: checkout.orderId,
        razorpayPaymentId: 'pay_test_1',
        razorpaySignature: 'tampered_signature_123456',
      })
      .expect(400);

    // 6. Valid signature verifies & commits stock + confirms order payment
    const rpPaymentId = `pay_rzp_${crypto.randomBytes(4).toString('hex')}`;
    mockRazorpayService.fetchPayment.mockResolvedValueOnce({
      id: rpPaymentId,
      entity: 'payment',
      amount: amountPaise,
      currency: 'INR',
      status: 'captured',
      order_id: checkout.orderId,
      method: 'upi',
      amount_refunded: 0,
      refund_status: null,
      captured: true,
      created_at: Math.floor(Date.now() / 1000),
    });

    const validSig = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${checkout.orderId}|${rpPaymentId}`)
      .digest('hex');

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        razorpayOrderId: checkout.orderId,
        razorpayPaymentId: rpPaymentId,
        razorpaySignature: validSig,
      })
      .expect(200);

    expect(verifyRes.body.status).toBe(PaymentStatus.CAPTURED);
    expect(verifyRes.body.orderPaymentStatus).toBe(PaymentStatus.SUCCESS);

    const invAfter = await prisma.inventory.findUniqueOrThrow({ where: { id: invId } });
    expect(invAfter.stockOnHand).toBe(8);
    expect(invAfter.reservedQuantity).toBe(0);

    // 7. Customer cannot access admin refund endpoint (403)
    await request(app.getHttpServer())
      .post(`/api/v1/admin/payments/${paymentId}/refunds`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Unauthorized attempt' })
      .expect(403);

    // 8. Admin issues partial refund
    const refundRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/payments/${paymentId}/refunds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100, reason: 'Partial goodwill refund' })
      .expect(201);

    expect(refundRes.body.status).toBe('PROCESSED');
    expect(refundRes.body.amount).toBe(100);
  });

  it('rejects invalid webhook signatures and deduplicates repeated webhook event IDs', async () => {
    const payload = JSON.stringify({ event: 'payment.captured', payload: {} });
    const eventId = `evt_e2e_${runId}`;

    // Invalid signature rejected
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/razorpay')
      .set('x-razorpay-signature', 'invalid_sig')
      .set('x-razorpay-event-id', eventId)
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(400);

    // Valid signature accepted
    const validSig = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(Buffer.from(payload, 'utf8'))
      .digest('hex');

    const first = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/razorpay')
      .set('x-razorpay-signature', validSig)
      .set('x-razorpay-event-id', eventId)
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(200);
    expect(first.body.status).toBe('ok');
    expect(first.body.duplicate).toBeUndefined();

    // Duplicate eventId deduplicated
    const dup = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/razorpay')
      .set('x-razorpay-signature', validSig)
      .set('x-razorpay-event-id', eventId)
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(200);
    expect(dup.body).toEqual({ status: 'ok', duplicate: true, eventId });
  });

  it('handles late payment capture after reservation expiry without negative stock', async () => {
    await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
    await prisma.cart.updateMany({
      where: { userId: customerId },
      data: { sellerId: null, appliedCouponCode: null },
    });

    // Exhaust stock to 1 unit, reserve it, expire reservation, let another order buy it, then capture late
    await prisma.inventory.update({
      where: { id: invId },
      data: { stockOnHand: 1, reservedQuantity: 0, availableQuantity: 1 },
    });

    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ sellerProductId: listingId, quantity: 1 })
      .expect(200);

    const prep = await request(app.getHttpServer())
      .post('/api/v1/checkout/prepare')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId })
      .expect(200);

    const sessionId = prep.body.checkoutSessionId;
    const init = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ checkoutSessionId: sessionId })
      .expect(200);

    const { orderId, amountPaise, checkout } = init.body;

    // Simulate reservation expiry & another buyer taking the final unit
    await prisma.stockReservation.updateMany({
      where: { checkoutSessionId: sessionId },
      data: { status: StockReservationStatus.EXPIRED },
    });
    await prisma.inventory.update({
      where: { id: invId },
      data: { stockOnHand: 0, reservedQuantity: 0, availableQuantity: 0 },
    });

    const latePayId = `pay_late_${crypto.randomBytes(4).toString('hex')}`;
    mockRazorpayService.fetchPayment.mockResolvedValueOnce({
      id: latePayId,
      entity: 'payment',
      amount: amountPaise,
      currency: 'INR',
      status: 'captured',
      order_id: checkout.orderId,
      method: 'upi',
      amount_refunded: 0,
      refund_status: null,
      captured: true,
      created_at: Math.floor(Date.now() / 1000),
    });

    const sig = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${checkout.orderId}|${latePayId}`)
      .digest('hex');

    const verify = await request(app.getHttpServer())
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        razorpayOrderId: checkout.orderId,
        razorpayPaymentId: latePayId,
        razorpaySignature: sig,
      })
      .expect(200);

    expect(verify.body.status).toBe(PaymentStatus.CAPTURED);

    // Order must be CANCELLED + REFUND_PENDING, and stock must NOT be negative!
    const orderAfter = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(orderAfter.status).toBe(OrderStatus.CANCELLED);
    expect(orderAfter.paymentStatus).toBe(PaymentStatus.REFUND_PENDING);

    const invAfter = await prisma.inventory.findUniqueOrThrow({ where: { id: invId } });
    expect(invAfter.stockOnHand).toBe(0);
    expect(invAfter.availableQuantity).toBe(0);

    // Clear customer cart if any
    await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
  });
});
