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
import { InventoryReservationService } from '../src/modules/inventory/services/inventory-reservation.service';
import { Decimal } from '@prisma/client/runtime/library';
import { ProductStatus, SellerProductStatus, SellerStatus } from '@prisma/client';

describe('Inventory & Concurrency Protection Engine (Real PostgreSQL E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reservationService: InventoryReservationService;

  let testStoreId: string;
  let testProductId: string;
  let testVariant1Id: string;
  let testVariant2Id: string;
  let testListing1Id: string;
  let testListing2Id: string;
  let testInventory1Id: string;
  let testInventory2Id: string;

  let sellerAuthToken: string;

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
    app.useGlobalInterceptors(new TransformInterceptor(reflector));
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
    reservationService = app.get<InventoryReservationService>(InventoryReservationService);

    // 1. Login as an approved seller
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'seller1@marvelsbasket.com',
        password: 'MarvelDevPassword2026!',
      })
      .expect(200);

    sellerAuthToken = loginRes.body.data.accessToken;

    // 2. Fetch or create a test store and product
    const store = await prisma.seller.findFirst({
      where: { status: { in: [SellerStatus.APPROVED_ACTIVE, 'APPROVED' as any] } },
    });
    testStoreId = store!.id;

    // Create a dedicated test category, product, and 2 variants
    const category = await prisma.category.findFirst();
    const product = await prisma.product.create({
      data: {
        name: `Concurrency Test Product ${Date.now()}`,
        slug: `concurrency-test-${Date.now()}`,
        categoryId: category!.id,
        status: ProductStatus.ACTIVE,
      },
    });
    testProductId = product.id;

    const v1 = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: 'Pack A (Small)',
        mrp: new Decimal(100.0),
        isActive: true,
      },
    });
    testVariant1Id = v1.id;

    const v2 = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: 'Pack B (Large)',
        mrp: new Decimal(200.0),
        isActive: true,
      },
    });
    testVariant2Id = v2.id;

    // Create 2 store listings
    const l1 = await prisma.sellerProduct.create({
      data: {
        sellerId: testStoreId,
        productId: product.id,
        variantId: v1.id,
        sellingPrice: new Decimal(90.0),
        mrp: new Decimal(100.0),
        status: SellerProductStatus.ACTIVE,
      },
    });
    testListing1Id = l1.id;

    const inv1 = await prisma.inventory.create({
      data: {
        sellerProductId: l1.id,
        stockOnHand: 1, // Only 1 item available!
        availableQuantity: 1,
        reservedQuantity: 0,
      },
    });
    testInventory1Id = inv1.id;

    const l2 = await prisma.sellerProduct.create({
      data: {
        sellerId: testStoreId,
        productId: product.id,
        variantId: v2.id,
        sellingPrice: new Decimal(180.0),
        mrp: new Decimal(200.0),
        status: SellerProductStatus.ACTIVE,
      },
    });
    testListing2Id = l2.id;

    const inv2 = await prisma.inventory.create({
      data: {
        sellerProductId: l2.id,
        stockOnHand: 10,
        availableQuantity: 10,
        reservedQuantity: 0,
      },
    });
    testInventory2Id = inv2.id;
  });

  afterAll(async () => {
    // Cleanup test records
    try {
      await prisma.stockReservation.deleteMany({
        where: { inventoryId: { in: [testInventory1Id, testInventory2Id] } },
      });
      await prisma.inventoryTransaction.deleteMany({
        where: { inventoryId: { in: [testInventory1Id, testInventory2Id] } },
      });
      await prisma.inventory.deleteMany({
        where: { id: { in: [testInventory1Id, testInventory2Id] } },
      });
      await prisma.sellerProduct.deleteMany({
        where: { id: { in: [testListing1Id, testListing2Id] } },
      });
      await prisma.productVariant.deleteMany({
        where: { id: { in: [testVariant1Id, testVariant2Id] } },
      });
      await prisma.product.deleteMany({
        where: { id: testProductId },
      });
    } catch (e) {
      // Ignored during cleanup
    }
    await app.close();
  });

  describe('1. Last-Item Race Condition (CRITICAL Section 8.A)', () => {
    it('should allow exactly one customer to reserve the last item and reject the competitor with 409 Conflict', async () => {
      // 1 item available on testInventory1Id
      const req1 = reservationService.createReservation({
        storeId: testStoreId,
        checkoutSessionId: `sess_user_A_${Date.now()}`,
        idempotencyKey: `idemp_user_A_${Date.now()}`,
        items: [{ listingId: testListing1Id, quantity: 1 }],
      });

      const req2 = reservationService.createReservation({
        storeId: testStoreId,
        checkoutSessionId: `sess_user_B_${Date.now()}`,
        idempotencyKey: `idemp_user_B_${Date.now()}`,
        items: [{ listingId: testListing1Id, quantity: 1 }],
      });

      // Fire both concurrently
      const results = await Promise.allSettled([req1, req2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one must succeed, exactly one must fail
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Verify the rejection was a ConflictException (HTTP 409)
      const reason = (rejected[0] as PromiseRejectedResult).reason;
      const status =
        typeof reason.getStatus === 'function'
          ? reason.getStatus()
          : reason.status || reason.statusCode;
      expect(status).toBe(409);
      expect(reason.message).toContain('Insufficient stock');

      // Check PostgreSQL database invariants
      const invAfter = await prisma.inventory.findUnique({
        where: { id: testInventory1Id },
      });

      expect(invAfter!.stockOnHand).toBe(1);
      expect(invAfter!.reservedQuantity).toBe(1);
      expect(invAfter!.availableQuantity).toBe(0); // Never negative!
    });
  });

  describe('2. Multi-Item Cart Deadlock Prevention (Section 8.B)', () => {
    it('should acquire locks in consistent ascending order and prevent deadlocks when carts contain items in opposite order', async () => {
      // Reset inventory stocks and listing status to ACTIVE
      await prisma.sellerProduct.update({
        where: { id: testListing1Id },
        data: { status: SellerProductStatus.ACTIVE },
      });
      await prisma.sellerProduct.update({
        where: { id: testListing2Id },
        data: { status: SellerProductStatus.ACTIVE },
      });
      await prisma.inventory.update({
        where: { id: testInventory1Id },
        data: { stockOnHand: 10, availableQuantity: 10, reservedQuantity: 0 },
      });
      await prisma.inventory.update({
        where: { id: testInventory2Id },
        data: { stockOnHand: 10, availableQuantity: 10, reservedQuantity: 0 },
      });

      // Customer 1 reserves: [Item 1, Item 2]
      const order1 = reservationService.createReservation({
        storeId: testStoreId,
        checkoutSessionId: `deadlock_sess_1_${Date.now()}`,
        idempotencyKey: `deadlock_idemp_1_${Date.now()}`,
        items: [
          { listingId: testListing1Id, quantity: 2 },
          { listingId: testListing2Id, quantity: 3 },
        ],
      });

      // Customer 2 reserves: [Item 2, Item 1] (opposite order!)
      const order2 = reservationService.createReservation({
        storeId: testStoreId,
        checkoutSessionId: `deadlock_sess_2_${Date.now()}`,
        idempotencyKey: `deadlock_idemp_2_${Date.now()}`,
        items: [
          { listingId: testListing2Id, quantity: 4 },
          { listingId: testListing1Id, quantity: 3 },
        ],
      });

      // Both execute concurrently without PostgreSQL deadlock!
      const [res1, res2] = await Promise.all([order1, order2]);

      expect(res1.status).toBe('ACTIVE');
      expect(res2.status).toBe('ACTIVE');

      const inv1 = await prisma.inventory.findUnique({ where: { id: testInventory1Id } });
      const inv2 = await prisma.inventory.findUnique({ where: { id: testInventory2Id } });

      // Item 1: 2 + 3 = 5 reserved, available = 5
      expect(inv1!.reservedQuantity).toBe(5);
      expect(inv1!.availableQuantity).toBe(5);

      // Item 2: 3 + 4 = 7 reserved, available = 3
      expect(inv2!.reservedQuantity).toBe(7);
      expect(inv2!.availableQuantity).toBe(3);
    });
  });

  describe('3. Idempotency & Repeatable Operations (Section 8.C, 10, 11)', () => {
    beforeEach(async () => {
      await prisma.sellerProduct.updateMany({
        where: { id: { in: [testListing1Id, testListing2Id] } },
        data: { status: SellerProductStatus.ACTIVE },
      });
      await prisma.inventory.update({
        where: { id: testInventory1Id },
        data: { stockOnHand: 10, availableQuantity: 10, reservedQuantity: 0 },
      });
      await prisma.inventory.update({
        where: { id: testInventory2Id },
        data: { stockOnHand: 10, availableQuantity: 10, reservedQuantity: 0 },
      });
    });

    it('should return identical reservation on duplicate call with same idempotency key without duplicate stock deductions', async () => {
      const idempotencyKey = `idemp_repeat_${Date.now()}`;
      const checkoutSessionId = `sess_repeat_${Date.now()}`;

      const firstCall = await reservationService.createReservation({
        storeId: testStoreId,
        checkoutSessionId,
        idempotencyKey,
        items: [{ listingId: testListing1Id, quantity: 1 }],
      });

      const invBeforeSecond = await prisma.inventory.findUnique({
        where: { id: testInventory1Id },
      });

      const secondCall = await reservationService.createReservation({
        storeId: testStoreId,
        checkoutSessionId,
        idempotencyKey,
        items: [{ listingId: testListing1Id, quantity: 1 }],
      });

      const invAfterSecond = await prisma.inventory.findUnique({ where: { id: testInventory1Id } });

      expect(firstCall.reservationId).toBe(secondCall.reservationId);
      // Reserved quantity did not increment twice
      expect(invAfterSecond!.reservedQuantity).toBe(invBeforeSecond!.reservedQuantity);
    });

    it('should commit reservation idempotently without double deducting physical stock', async () => {
      const checkoutSessionId = `commit_sess_${Date.now()}`;
      const idempotencyKey = `commit_idemp_${Date.now()}`;

      await reservationService.createReservation({
        storeId: testStoreId,
        checkoutSessionId,
        idempotencyKey: `res_${idempotencyKey}`,
        items: [{ listingId: testListing1Id, quantity: 1 }],
      });

      const invBeforeCommit = await prisma.inventory.findUnique({
        where: { id: testInventory1Id },
      });

      // First commit
      const commit1 = await reservationService.commitReservation({
        checkoutSessionId,
        idempotencyKey,
      });

      const invAfterCommit1 = await prisma.inventory.findUnique({
        where: { id: testInventory1Id },
      });

      // Physical stock on hand decreased by 1
      expect(invAfterCommit1!.stockOnHand).toBe(invBeforeCommit!.stockOnHand - 1);

      // Second commit (idempotent retry)
      const commit2 = await reservationService.commitReservation({
        checkoutSessionId,
        idempotencyKey,
      });

      const invAfterCommit2 = await prisma.inventory.findUnique({
        where: { id: testInventory1Id },
      });

      expect(commit1.status).toBe('COMMITTED');
      expect(commit2.status).toBe('COMMITTED');
      // Physical stock on hand did not decrease again!
      expect(invAfterCommit2!.stockOnHand).toBe(invAfterCommit1!.stockOnHand);
    });

    it('should release reservation and restore available stock idempotently', async () => {
      const checkoutSessionId = `release_sess_${Date.now()}`;

      await reservationService.createReservation({
        storeId: testStoreId,
        checkoutSessionId,
        idempotencyKey: `res_rel_${Date.now()}`,
        items: [{ listingId: testListing2Id, quantity: 2 }],
      });

      const invBeforeRelease = await prisma.inventory.findUnique({
        where: { id: testInventory2Id },
      });

      // First release
      const rel1 = await reservationService.releaseReservation({
        checkoutSessionId,
        reason: 'Payment timeout test',
      });

      const invAfterRelease1 = await prisma.inventory.findUnique({
        where: { id: testInventory2Id },
      });

      expect(invAfterRelease1!.availableQuantity).toBe(invBeforeRelease!.availableQuantity + 2);
      expect(invAfterRelease1!.reservedQuantity).toBe(invBeforeRelease!.reservedQuantity - 2);

      // Second release (idempotent retry)
      const rel2 = await reservationService.releaseReservation({
        checkoutSessionId,
        reason: 'Payment timeout test',
      });

      const invAfterRelease2 = await prisma.inventory.findUnique({
        where: { id: testInventory2Id },
      });

      expect(rel1.status).toBe('RELEASED');
      expect(rel2.status).toBe('RELEASED');
      expect(invAfterRelease2!.availableQuantity).toBe(invAfterRelease1!.availableQuantity);
    });
  });

  describe('4. PostgreSQL Check Constraints & Invariant Enforcement (Section 19)', () => {
    it('should reject direct database update setting negative stock on hand', async () => {
      await expect(
        prisma.$executeRaw`
          UPDATE "inventories"
          SET "stock_on_hand" = -5
          WHERE "id" = ${testInventory1Id}::uuid
        `,
      ).rejects.toThrow();
    });

    it('should reject direct database update setting selling price higher than MRP', async () => {
      await expect(
        prisma.$executeRaw`
          UPDATE "seller_products"
          SET "selling_price" = 500.00
          WHERE "id" = ${testListing1Id}::uuid
        `,
      ).rejects.toThrow();
    });

    it('should reject direct database insert of duplicate (seller_id, variant_id)', async () => {
      await expect(
        prisma.$executeRaw`
          INSERT INTO "seller_products" (
            "id", "seller_id", "product_id", "variant_id", "selling_price", "mrp", "status", "created_at", "updated_at"
          ) VALUES (
            gen_random_uuid(), ${testStoreId}::uuid, ${testProductId}::uuid, ${testVariant1Id}::uuid, 80.00, 100.00, 'ACTIVE', NOW(), NOW()
          )
        `,
      ).rejects.toThrow();
    });
  });
});
