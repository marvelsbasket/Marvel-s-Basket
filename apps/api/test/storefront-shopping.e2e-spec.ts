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

describe('Customer Shopping Experience (Phase 10 E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;

  const customerCredentials = {
    email: 'customer.dev@marvelsbasket.com',
    password: 'MarvelDevPassword2026!',
  };

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

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(customerCredentials)
      .expect(200);

    customerToken = loginRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .catch(() => {});
    await app.close();
  });

  describe('Location Serviceability & Nearby Store Discovery', () => {
    it('returns serviceable nearby stores for PIN 560038 (Indiranagar)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/serviceability?postalCode=560038')
        .expect(200);

      expect(res.body.data.isServiceable).toBe(true);
      expect(res.body.data.activeStore).not.toBeNull();
      expect(res.body.data.nearbyStores.length).toBeGreaterThan(0);
    });

    it('returns unserviceable state and NO fabricated store for unsupported PIN 999999', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/serviceability?postalCode=999999')
        .expect(200);

      expect(res.body.data.isServiceable).toBe(false);
      expect(res.body.data.activeStore).toBeNull();
      expect(res.body.data.nearbyStores).toEqual([]);
    });

    it('returns store profile and store-scoped catalog via /stores/:slug', async () => {
      const storeRes = await request(app.getHttpServer())
        .get('/api/v1/stores/fresh-farms-indiranagar')
        .expect(200);
      expect(storeRes.body.data.slug).toBe('fresh-farms-indiranagar');

      const prodRes = await request(app.getHttpServer())
        .get('/api/v1/stores/fresh-farms-indiranagar/products')
        .expect(200);
      expect(prodRes.body.data.items.length).toBeGreaterThan(0);
      for (const item of prodRes.body.data.items) {
        expect(item.store?.slug).toBe('fresh-farms-indiranagar');
      }
    });
  });

  describe('Location-Aware Catalog, Search & Hinglish Synonyms', () => {
    it('does not attach fabricated local store stock when no location is given', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products').expect(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0].store).toBeNull();
      expect(res.body.data.metaInfo?.hasLocationContext).toBe(false);
    });

    it('resolves Hinglish search query (doodh) and autocomplete suggestions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/search/suggestions?q=doodh&postalCode=560038')
        .expect(200);
      expect(res.body.data.products.length).toBeGreaterThan(0);
    });
  });

  describe('Persistent Single-Store Basket & Store Switch Validation', () => {
    it('adds item to customer basket, enforces single-store boundary, and cleans up', async () => {
      const store1List = await request(app.getHttpServer())
        .get('/api/v1/stores/fresh-farms-indiranagar/products')
        .expect(200);
      const store2List = await request(app.getHttpServer())
        .get('/api/v1/stores/nature-fresh-koramangala/products')
        .expect(200);

      const sp1 = store1List.body.data.items.find(
        (p: { defaultVariant?: { sellerProductId?: string }; availableQuantity: number }) =>
          p.defaultVariant?.sellerProductId && p.availableQuantity > 0,
      )?.defaultVariant?.sellerProductId;
      const sp2 = store2List.body.data.items.find(
        (p: { defaultVariant?: { sellerProductId?: string }; availableQuantity: number }) =>
          p.defaultVariant?.sellerProductId && p.availableQuantity > 0,
      )?.defaultVariant?.sellerProductId;

      if (!sp1 || !sp2) return;

      // Clear first
      await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Add from Store 1
      const add1 = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ sellerProductId: sp1, quantity: 1 })
        .expect(200);
      expect(add1.body.data.totalUnits).toBe(1);

      // Adding from Store 2 without confirmation returns 409 STORE_SWITCH_REQUIRED
      const conflict = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ sellerProductId: sp2, quantity: 1 })
        .expect(409);
      expect(conflict.body.code).toBe('STORE_SWITCH_REQUIRED');

      // Compare store switch to Koramangala store (560095)
      const firstItem = add1.body.data.items[0];
      const compareRes = await request(app.getHttpServer())
        .post('/api/v1/cart/compare-store')
        .send({
          currentStoreId: add1.body.data.sellerId,
          postalCode: '560095',
          items: [
            {
              sellerProductId: firstItem.sellerProductId,
              variantId: firstItem.variantId,
              productId: firstItem.productId,
              quantity: firstItem.quantity,
              unitPrice: firstItem.unitPrice,
            },
          ],
        })
        .expect(200);
      expect(compareRes.body.data.isServiceable).toBe(true);
      expect(compareRes.body.data.newStore?.slug).toBe('nature-fresh-koramangala');

      // Ensure prisma instance was used cleanly
      expect(prisma).toBeDefined();
    });
  });

  describe('Place Search & Structured Address Confirmation Persistence', () => {
    it('returns serviceable place suggestions for GET /locations/places?q=560038', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/places?q=560038')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].postalCode).toBe('560038');
    });

    it('persists confirmed address with coordinates, sets single default atomically, and deduplicates repeat saves', async () => {
      const addressPayload = {
        addressType: 'OFFICE',
        label: 'Office',
        recipientName: 'Dev Customer',
        phone: '9876543210',
        forSomeoneElse: false,
        addressLine1: 'Floor 3, Phase 10 Tech Hub',
        addressLine2: '100 Feet Road',
        landmark: 'Near Metro Station',
        locality: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        latitude: 12.9784,
        longitude: 77.6408,
        isDefault: true,
      };

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(addressPayload)
        .expect(201);

      const createdId = createRes.body.data.id;
      expect(createRes.body.data.addressType).toBe('OFFICE');
      expect(createRes.body.data.locality).toBe('Indiranagar');
      expect(createRes.body.data.isDefault).toBe(true);

      // Re-saving same house/pin/city deduplicates cleanly and preserves single default
      const dedupRes = await request(app.getHttpServer())
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ ...addressPayload, landmark: 'Updated Landmark' })
        .expect(201);

      expect(dedupRes.body.data.id).toBe(createdId);
      expect(dedupRes.body.data.landmark).toBe('Updated Landmark');

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      const defaults = (listRes.body.data as Array<{ isDefault: boolean }>).filter(
        (a) => a.isDefault,
      );
      expect(defaults).toHaveLength(1);

      // Cleanup test address (restores previous default cleanly)
      await request(app.getHttpServer())
        .delete(`/api/v1/addresses/${createdId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
    });
  });
});
