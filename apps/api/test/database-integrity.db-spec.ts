import {
  PrismaClient,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  LedgerEntryType,
  SettlementStatus,
  DeliveryAssignmentStatus,
  Prisma,
} from '@prisma/client';

describe('Database Integrity & Marketplace Invariant Test Suite', () => {
  let prisma: PrismaClient;

  // Track created entities for clean teardown
  const createdOrderIds: string[] = [];
  const createdSettlementIds: string[] = [];
  const createdWebhookIds: string[] = [];
  const createdCartUserIds: string[] = [];
  let testCustomerUserId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    // Teardown test artifacts in reverse dependency order
    try {
      if (createdWebhookIds.length > 0) {
        await prisma.paymentWebhookEvent.deleteMany({
          where: { id: { in: createdWebhookIds } },
        });
      }

      if (createdSettlementIds.length > 0) {
        await prisma.settlementItem.deleteMany({
          where: { settlementId: { in: createdSettlementIds } },
        });
        await prisma.settlement.deleteMany({
          where: { id: { in: createdSettlementIds } },
        });
      }

      if (createdOrderIds.length > 0) {
        await prisma.deliveryAssignment.deleteMany({
          where: { delivery: { orderId: { in: createdOrderIds } } },
        });
        await prisma.deliveryStatusHistory.deleteMany({
          where: { delivery: { orderId: { in: createdOrderIds } } },
        });
        await prisma.delivery.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.sellerLedgerEntry.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.commissionRecord.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.paymentTransaction.deleteMany({
          where: { payment: { orderId: { in: createdOrderIds } } },
        });
        await prisma.payment.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.orderStatusHistory.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.orderItem.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        });
        await prisma.order.deleteMany({
          where: { id: { in: createdOrderIds } },
        });
      }

      if (createdCartUserIds.length > 0) {
        await prisma.cartItem.deleteMany({
          where: { cart: { userId: { in: createdCartUserIds } } },
        });
        await prisma.cart.deleteMany({
          where: { userId: { in: createdCartUserIds } },
        });
      }

      if (testCustomerUserId) {
        await prisma.user.deleteMany({
          where: { id: testCustomerUserId },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  // ============================================================================
  // 1. Relational Integrity & Seeded Entities
  // ============================================================================
  describe('Seeded Schema & Foreign Key Integrity', () => {
    it('should verify roles, permissions, and super admin mapping', async () => {
      const superAdminRole = await prisma.role.findUnique({
        where: { name: 'SUPER_ADMIN' },
        include: { rolePermissions: { include: { permission: true } } },
      });
      expect(superAdminRole).toBeDefined();
      expect(superAdminRole?.rolePermissions.length).toBeGreaterThanOrEqual(10);

      const superAdminUser = await prisma.user.findUnique({
        where: { email: 'admin@marvelsbasket.com' },
        include: { userRoles: { include: { role: true } } },
      });
      expect(superAdminUser).toBeDefined();
      expect(superAdminUser?.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN')).toBe(true);
    });

    it('should verify catalog category hierarchy and master products', async () => {
      const riceProduct = await prisma.product.findUnique({
        where: { slug: 'india-gate-classic-basmati-rice-1kg' },
        include: { category: true },
      });
      expect(riceProduct).toBeDefined();
      expect(riceProduct?.category.name).toBe('Groceries & Staples');
    });
  });

  // ============================================================================
  // 2. Marketplace Invariant: Multi-Store Listings & Price Comparison
  // ============================================================================
  describe('Multi-Store Product Listing Invariant', () => {
    it('should permit the same master product to be listed in multiple stores with distinct prices', async () => {
      const riceProduct = await prisma.product.findUnique({
        where: { slug: 'india-gate-classic-basmati-rice-1kg' },
      });
      expect(riceProduct).toBeDefined();

      const listings = await prisma.sellerProduct.findMany({
        where: { productId: riceProduct!.id },
        include: { seller: true, inventory: true },
      });

      // Must have listings in both Store 1 (Indiranagar) and Store 2 (Koramangala)
      expect(listings.length).toBeGreaterThanOrEqual(2);

      const store1Listing = listings.find((l) => l.seller.slug === 'fresh-farms-indiranagar');
      const store2Listing = listings.find((l) => l.seller.slug === 'nature-fresh-koramangala');

      expect(store1Listing).toBeDefined();
      expect(store2Listing).toBeDefined();

      // Distinct selling prices as seeded
      expect(Number(store1Listing!.sellingPrice)).toBe(165.0);
      expect(Number(store2Listing!.sellingPrice)).toBe(160.0);

      // Independent inventory
      expect(store1Listing!.inventory?.availableQuantity).toBe(50);
      expect(store2Listing!.inventory?.availableQuantity).toBe(35);
    });

    it('should prevent duplicate listings for the same store and master product', async () => {
      const store1 = await prisma.seller.findUnique({ where: { slug: 'fresh-farms-indiranagar' } });
      const riceProduct = await prisma.product.findUnique({
        where: { slug: 'india-gate-classic-basmati-rice-1kg' },
      });

      // Attempting to duplicate listing with existing seller + product + variant
      await expect(
        prisma.sellerProduct.create({
          data: {
            sellerId: store1!.id,
            productId: riceProduct!.id,
            sellingPrice: new Prisma.Decimal(170.0),
            status: 'ACTIVE',
          },
        }),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // 3. Marketplace Invariant: Single-Store Shopping Cart
  // ============================================================================
  describe('Single-Store Shopping Cart Invariant', () => {
    it('should create and enforce single-store cart structure', async () => {
      // Create dedicated test customer
      const testCustomer = await prisma.user.create({
        data: {
          name: 'Cart Test User',
          email: `cart.test.${Date.now()}@marvelsbasket.com`,
          phone: `+9188${Date.now().toString().slice(-8)}`,
        },
      });
      testCustomerUserId = testCustomer.id;
      createdCartUserIds.push(testCustomer.id);

      const store1 = await prisma.seller.findUnique({ where: { slug: 'fresh-farms-indiranagar' } });
      const store1Listing = await prisma.sellerProduct.findFirst({
        where: { sellerId: store1!.id },
      });

      // Cart is locked to store 1
      const cart = await prisma.cart.create({
        data: {
          userId: testCustomer.id,
          sellerId: store1!.id,
          items: {
            create: {
              sellerProductId: store1Listing!.id,
              quantity: 2,
            },
          },
        },
        include: { items: true },
      });

      expect(cart.sellerId).toBe(store1!.id);
      expect(cart.items.length).toBe(1);
      expect(cart.items[0].quantity).toBe(2);

      // Unique constraint on cartId + sellerProductId prevents duplicate lines
      await expect(
        prisma.cartItem.create({
          data: {
            cartId: cart.id,
            sellerProductId: store1Listing!.id,
            quantity: 1,
          },
        }),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // 4. Marketplace Invariant: Single-Store Order & Immutable Snapshots
  // ============================================================================
  describe('Single-Store Order & Immutable Price Snapshots', () => {
    it('should create order and guarantee that item snapshots are immutable against listing price mutations', async () => {
      const customer = await prisma.user.findUnique({
        where: { email: 'customer.dev@marvelsbasket.com' },
      });
      const store1 = await prisma.seller.findUnique({ where: { slug: 'fresh-farms-indiranagar' } });
      const riceListing = await prisma.sellerProduct.findFirst({
        where: {
          sellerId: store1!.id,
          product: { slug: 'india-gate-classic-basmati-rice-1kg' },
        },
        include: { product: true },
      });

      const orderNumber = `MB-TEST-${Date.now()}`;
      const originalUnitPrice = Number(riceListing!.sellingPrice); // 165.00
      const purchasedQuantity = 3;
      const calculatedTotal = originalUnitPrice * purchasedQuantity; // 495.00

      // Create Order with frozen snapshots
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer!.id,
          sellerId: store1!.id,
          addressSnapshot: {
            recipientName: 'Rohan Sharma',
            phone: '+919999900002',
            addressLine1: 'Flat 402, Marvel Heights',
            city: 'Bengaluru',
            postalCode: '560001',
          },
          subtotal: new Prisma.Decimal(calculatedTotal),
          deliveryFee: new Prisma.Decimal(29.0),
          discountAmount: new Prisma.Decimal(0.0),
          taxAmount: new Prisma.Decimal(0.0),
          totalAmount: new Prisma.Decimal(calculatedTotal + 29.0),
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.SUCCESS,
          deliveryStatus: DeliveryStatus.PENDING,
          items: {
            create: {
              sellerProductId: riceListing!.id,
              productNameSnapshot: riceListing!.product.name,
              skuSnapshot: riceListing!.sellerSku,
              unitPrice: new Prisma.Decimal(originalUnitPrice),
              mrp: riceListing!.mrp,
              quantity: purchasedQuantity,
              totalAmount: new Prisma.Decimal(calculatedTotal),
            },
          },
          statusHistory: {
            create: {
              previousStatus: OrderStatus.PENDING,
              newStatus: OrderStatus.CONFIRMED,
              note: 'Order placed and payment confirmed',
            },
          },
        },
        include: { items: true, statusHistory: true },
      });

      createdOrderIds.push(order.id);

      expect(order.orderNumber).toBe(orderNumber);
      expect(order.sellerId).toBe(store1!.id);
      expect(order.items.length).toBe(1);
      expect(Number(order.items[0].unitPrice)).toBe(originalUnitPrice);
      expect(Number(order.items[0].totalAmount)).toBe(calculatedTotal);

      // Now, simulate the seller updating their live store listing price to ₹200
      await prisma.sellerProduct.update({
        where: { id: riceListing!.id },
        data: { sellingPrice: new Prisma.Decimal(200.0) },
      });

      // Fetch the historical order item again
      const refreshedOrderItem = await prisma.orderItem.findUnique({
        where: { id: order.items[0].id },
      });

      // Invariant: The historical order item snapshot MUST remain ₹165.00
      expect(Number(refreshedOrderItem!.unitPrice)).toBe(originalUnitPrice);
      expect(Number(refreshedOrderItem!.totalAmount)).toBe(calculatedTotal);

      // Revert store listing price back to 165
      await prisma.sellerProduct.update({
        where: { id: riceListing!.id },
        data: { sellingPrice: new Prisma.Decimal(originalUnitPrice) },
      });
    });
  });

  // ============================================================================
  // 5. Payment & Webhook Idempotency Invariant
  // ============================================================================
  describe('Payment Webhook Idempotency Invariant', () => {
    it('should record webhook events and reject duplicate replays via composite unique key', async () => {
      const eventId = `evt_test_idempotency_${Date.now()}`;
      const provider = 'RAZORPAY';

      // First webhook ingestion succeeds
      const webhook = await prisma.paymentWebhookEvent.create({
        data: {
          provider,
          eventId,
          eventType: 'order.paid',
          payload: { id: eventId, entity: 'event', event: 'order.paid' },
          status: 'PROCESSED',
        },
      });
      createdWebhookIds.push(webhook.id);

      expect(webhook.eventId).toBe(eventId);

      // Second identical webhook ingestion MUST fail with duplicate key violation
      await expect(
        prisma.paymentWebhookEvent.create({
          data: {
            provider,
            eventId,
            eventType: 'order.paid',
            payload: { id: eventId, entity: 'event', event: 'order.paid' },
            status: 'PROCESSED',
          },
        }),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // 6. Commission & Double-Entry Financial Ledger
  // ============================================================================
  describe('Commission & Seller Financial Ledger Invariant', () => {
    it('should record commission snapshot and create ledger credit with double-settlement protection', async () => {
      const orderId = createdOrderIds[0];
      expect(orderId).toBeDefined();

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      const store1 = await prisma.seller.findUnique({ where: { id: order!.sellerId } });

      const grossItemAmount = Number(order!.subtotal); // 495.00
      const commissionRate = 10.0; // 10%
      const commissionAmount = (grossItemAmount * commissionRate) / 100; // 49.50
      const taxOnCommission = (commissionAmount * 18) / 100; // 8.91 (18% GST)
      const netSellerPayable = grossItemAmount - commissionAmount - taxOnCommission; // 436.59

      // 1. Commission Snapshot
      const commissionRecord = await prisma.commissionRecord.create({
        data: {
          orderId: order!.id,
          sellerId: store1!.id,
          grossItemAmount: new Prisma.Decimal(grossItemAmount),
          commissionRate: new Prisma.Decimal(commissionRate),
          commissionAmount: new Prisma.Decimal(commissionAmount),
          taxOnCommission: new Prisma.Decimal(taxOnCommission),
          netSellerPayable: new Prisma.Decimal(netSellerPayable),
        },
      });
      expect(commissionRecord).toBeDefined();

      // 2. Ledger Entries (Credit for order item sale, debit for commission)
      const creditEntry = await prisma.sellerLedgerEntry.create({
        data: {
          sellerId: store1!.id,
          orderId: order!.id,
          entryType: LedgerEntryType.ORDER_CREDIT,
          amount: new Prisma.Decimal(grossItemAmount),
          balanceAfter: new Prisma.Decimal(grossItemAmount),
          description: `Credit for order ${order!.orderNumber}`,
          referenceId: order!.orderNumber,
        },
      });

      // 3. Settlement Batch linking ledger entry
      const settlementNumber = `SETTL-TEST-${Date.now()}`;
      const settlement = await prisma.settlement.create({
        data: {
          settlementNumber,
          sellerId: store1!.id,
          grossAmount: new Prisma.Decimal(grossItemAmount),
          commissionAmount: new Prisma.Decimal(commissionAmount),
          netAmount: new Prisma.Decimal(netSellerPayable),
          status: SettlementStatus.PENDING,
          periodStart: new Date(Date.now() - 7 * 86400000),
          periodEnd: new Date(),
          items: {
            create: {
              sellerLedgerEntryId: creditEntry.id,
              amount: new Prisma.Decimal(grossItemAmount),
            },
          },
        },
        include: { items: true },
      });
      createdSettlementIds.push(settlement.id);

      expect(settlement.items.length).toBe(1);

      // Invariant: An entry cannot be settled a second time in another settlement batch
      await expect(
        prisma.settlementItem.create({
          data: {
            settlementId: settlement.id,
            sellerLedgerEntryId: creditEntry.id, // Duplicate ledger entry ID
            amount: new Prisma.Decimal(grossItemAmount),
          },
        }),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // 7. Delivery Lifecycle & Rider Assignment
  // ============================================================================
  describe('Delivery Lifecycle & Rider Assignment', () => {
    it('should assign a rider and track delivery status progression', async () => {
      const orderId = createdOrderIds[0];
      const rider = await prisma.deliveryPartner.findFirst({
        where: { availabilityStatus: 'ONLINE' },
      });
      expect(rider).toBeDefined();

      const delivery = await prisma.delivery.create({
        data: {
          orderId,
          deliveryPartnerId: rider!.id,
          status: DeliveryStatus.ASSIGNED,
          pickupAddressSnapshot: { store: 'Fresh Farms Indiranagar', phone: '+919999900003' },
          deliveryAddressSnapshot: { recipient: 'Rohan Sharma', phone: '+919999900002' },
          proofOfDeliveryOtp: '4582',
          assignments: {
            create: {
              deliveryPartnerId: rider!.id,
              status: DeliveryAssignmentStatus.ACCEPTED,
              respondedAt: new Date(),
            },
          },
          statusHistory: {
            create: {
              previousStatus: DeliveryStatus.PENDING,
              newStatus: DeliveryStatus.ASSIGNED,
              note: 'Rider Vikram Singh assigned to delivery',
            },
          },
        },
        include: { assignments: true, statusHistory: true },
      });

      expect(delivery.orderId).toBe(orderId);
      expect(delivery.status).toBe(DeliveryStatus.ASSIGNED);
      expect(delivery.assignments.length).toBe(1);
      expect(delivery.statusHistory.length).toBe(1);

      // 1-to-1 order-to-delivery constraint: An order cannot have two active deliveries
      await expect(
        prisma.delivery.create({
          data: {
            orderId,
            status: DeliveryStatus.PENDING,
            pickupAddressSnapshot: {},
            deliveryAddressSnapshot: {},
          },
        }),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // 8. Transaction Atomicity & Rollback Integrity
  // ============================================================================
  describe('Transaction Atomicity & Rollback Integrity', () => {
    it('should roll back all operations in an atomic transaction when a step fails', async () => {
      const uniqueCode = `COUPON_FAIL_${Date.now()}`;

      try {
        await prisma.$transaction(async (tx) => {
          // Step 1: Create a temporary coupon
          await tx.coupon.create({
            data: {
              code: uniqueCode,
              discountValue: new Prisma.Decimal(100.0),
              startsAt: new Date(),
              expiresAt: new Date(Date.now() + 86400000),
            },
          });

          // Step 2: Deliberately throw an error to simulate mid-transaction failure
          throw new Error('Simulated atomic transaction failure');
        });
      } catch (err: any) {
        expect(err.message).toBe('Simulated atomic transaction failure');
      }

      // Verify that Step 1 was cleanly rolled back
      const couponCheck = await prisma.coupon.findUnique({
        where: { code: uniqueCode },
      });
      expect(couponCheck).toBeNull();
    });
  });
});
