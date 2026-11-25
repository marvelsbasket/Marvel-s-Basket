import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  CheckoutSessionStatus,
  ProductStatus,
  SellerProductStatus,
  SellerStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { PricingService } from '../cart/pricing.service';
import { InventoryReservationService } from '../inventory/services/inventory-reservation.service';
import { CheckoutService } from './checkout.service';

describe('CheckoutService', () => {
  let service: CheckoutService;

  const mockPrisma = {
    customerAddress: { findFirst: jest.fn() },
    cart: { findUnique: jest.fn() },
    checkoutSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    platformSetting: { findMany: jest.fn() },
    coupon: { findUnique: jest.fn() },
    couponUsage: { count: jest.fn() },
  };

  const mockReservationService = {
    createReservation: jest.fn(),
    releaseReservation: jest.fn(),
    expireSessionReservation: jest.fn(),
  };

  const mockStoresService = {
    evaluateStoreOperationalStatus: jest.fn(),
    computeDeliveryEstimate: jest.fn(),
    calculateDistanceKm: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        PricingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StoresService, useValue: mockStoresService },
        { provide: InventoryReservationService, useValue: mockReservationService },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    jest.clearAllMocks();

    mockPrisma.platformSetting.findMany.mockResolvedValue([
      { key: 'minimum_order_value', value: 149 },
      { key: 'default_delivery_fee', value: 29 },
      { key: 'free_delivery_threshold', value: 499 },
    ]);
    mockStoresService.evaluateStoreOperationalStatus.mockReturnValue({
      isApproved: true,
      isOpen: true,
      isAcceptingOrders: true,
      isClosingSoon: false,
      closingSoonMinutes: null,
      operationalStatusLabel: 'Open',
      openingTime: '07:00',
      closingTime: '23:00',
    });
    mockStoresService.computeDeliveryEstimate.mockReturnValue({
      deliveryTimeMinutes: 20,
      deliveryEtaLabel: '15–20 mins',
    });
    mockStoresService.calculateDistanceKm.mockReturnValue(1.2);
  });

  const baseAddress = {
    id: 'addr-1',
    userId: 'user-1',
    label: 'Home',
    recipientName: 'Arry',
    phone: '9876543210',
    addressLine1: '123 Main St',
    addressLine2: null,
    landmark: null,
    locality: 'Civil Lines',
    city: 'Azamgarh',
    state: 'UP',
    postalCode: '276001',
    latitude: new Decimal(26.065),
    longitude: new Decimal(83.185),
  };

  const baseCart = {
    id: 'cart-1',
    userId: 'user-1',
    sellerId: 'seller-1',
    appliedCouponCode: null,
    seller: {
      id: 'seller-1',
      businessName: 'Fresh Mart',
      storeDisplayName: 'Fresh Mart',
      slug: 'fresh-mart',
      status: SellerStatus.APPROVED_ACTIVE,
      profile: {
        latitude: new Decimal(26.06),
        longitude: new Decimal(83.18),
        serviceRadiusKm: new Decimal(5),
        preparationTime: 15,
      },
      businessHours: [],
    },
    items: [
      {
        id: 'ci-1',
        quantity: 2,
        sellerProduct: {
          id: 'sp-1',
          productId: 'prod-1',
          variantId: 'var-1',
          sellingPrice: new Decimal(100),
          mrp: new Decimal(120),
          status: SellerProductStatus.ACTIVE,
          deletedAt: null,
          product: {
            name: 'Amul Milk',
            slug: 'amul-milk',
            status: ProductStatus.ACTIVE,
            deletedAt: null,
            images: [],
          },
          variant: {
            name: '1L',
            packSize: '1L',
            mrp: new Decimal(120),
            isActive: true,
            primaryImageUrl: null,
          },
          inventory: { id: 'inv-1', availableQuantity: 10 },
        },
      },
    ],
  };

  it('prepares checkout and reserves inventory for 15 minutes', async () => {
    mockPrisma.customerAddress.findFirst.mockResolvedValue(baseAddress);
    mockPrisma.cart.findUnique.mockResolvedValue(baseCart);
    mockPrisma.checkoutSession.findMany.mockResolvedValue([]);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    mockPrisma.checkoutSession.create.mockResolvedValue({
      id: 'sess-1',
      cartId: 'cart-1',
      sellerId: 'seller-1',
      addressId: 'addr-1',
      addressSnapshot: baseAddress,
      couponCode: null,
      status: CheckoutSessionStatus.RESERVATION_ACTIVE,
      itemSubtotal: new Decimal(200),
      productDiscount: new Decimal(40),
      couponDiscount: new Decimal(0),
      deliveryFee: new Decimal(29),
      taxAmount: new Decimal(0),
      grandTotal: new Decimal(229),
      distanceKm: new Decimal(1.2),
      itemsSnapshot: [],
      expiresAt,
    });
    mockReservationService.createReservation.mockResolvedValue({
      reservationId: 'res-1',
      expiresAt: expiresAt.toISOString(),
    });
    mockPrisma.checkoutSession.update.mockImplementation(async ({ data }) => ({
      id: 'sess-1',
      cartId: 'cart-1',
      sellerId: 'seller-1',
      addressId: 'addr-1',
      addressSnapshot: baseAddress,
      couponCode: null,
      status: CheckoutSessionStatus.RESERVATION_ACTIVE,
      itemSubtotal: new Decimal(200),
      productDiscount: new Decimal(40),
      couponDiscount: new Decimal(0),
      deliveryFee: new Decimal(29),
      taxAmount: new Decimal(0),
      grandTotal: new Decimal(229),
      distanceKm: new Decimal(1.2),
      itemsSnapshot: [],
      expiresAt: data.expiresAt,
    }));

    const res = await service.prepareCheckout('user-1', { addressId: 'addr-1' });
    expect(res.checkoutSessionId).toBe('sess-1');
    expect(res.priceBreakdown.grandTotal).toBe(229);
    expect(mockReservationService.createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ ttlMinutes: 15 }),
    );
  });

  it('detects price changes and throws ConflictException without reserving', async () => {
    mockPrisma.customerAddress.findFirst.mockResolvedValue(baseAddress);
    mockPrisma.cart.findUnique.mockResolvedValue(baseCart);

    await expect(
      service.prepareCheckout('user-1', {
        addressId: 'addr-1',
        expectedItemPrices: [{ sellerProductId: 'sp-1', unitPrice: 90 }],
      }),
    ).rejects.toThrow(ConflictException);
    expect(mockReservationService.createReservation).not.toHaveBeenCalled();
  });

  it('rejects checkout when store is closed', async () => {
    mockPrisma.customerAddress.findFirst.mockResolvedValue(baseAddress);
    mockPrisma.cart.findUnique.mockResolvedValue(baseCart);
    mockStoresService.evaluateStoreOperationalStatus.mockReturnValue({
      isApproved: true,
      isOpen: false,
      isAcceptingOrders: false,
      operationalStatusLabel: 'Closed',
      openingTime: '07:00',
      closingTime: '23:00',
    });

    await expect(service.prepareCheckout('user-1', { addressId: 'addr-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects checkout when cart is below MOV', async () => {
    mockPrisma.customerAddress.findFirst.mockResolvedValue(baseAddress);
    mockPrisma.cart.findUnique.mockResolvedValue({
      ...baseCart,
      items: [
        {
          ...baseCart.items[0],
          quantity: 1, // ₹100 < ₹149 MOV
        },
      ],
    });

    await expect(service.prepareCheckout('user-1', { addressId: 'addr-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('cancels checkout and releases reservations immediately', async () => {
    mockPrisma.checkoutSession.findMany.mockResolvedValue([{ id: 'sess-1' }]);
    mockReservationService.releaseReservation.mockResolvedValue({ releasedCount: 1 });
    mockPrisma.checkoutSession.updateMany.mockResolvedValue({ count: 1 });

    const res = await service.cancelCheckout('user-1', { checkoutSessionId: 'sess-1' });
    expect(res.cancelled).toBe(true);
    expect(mockReservationService.releaseReservation).toHaveBeenCalledWith(
      expect.objectContaining({ checkoutSessionId: 'sess-1' }),
    );
  });
});
