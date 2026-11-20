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

describe('Product Catalog & Categories (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminCredentials = {
    email: 'admin@marvelsbasket.com',
    password: 'MarvelDevPassword2026!',
  };

  let tokenAdmin: string;
  let createdCategoryId: string;
  let createdProductId: string;

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

    // Login as Super Admin to get auth token
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(200);

    tokenAdmin = adminLoginRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Clean up created resources if any
    if (createdProductId) {
      await prisma.productImage
        .deleteMany({ where: { productId: createdProductId } })
        .catch(() => {});
      await prisma.productVariant
        .deleteMany({ where: { productId: createdProductId } })
        .catch(() => {});
      await prisma.product.delete({ where: { id: createdProductId } }).catch(() => {});
    }
    if (createdCategoryId) {
      await prisma.category.delete({ where: { id: createdCategoryId } }).catch(() => {});
    }
    await app.close();
  });

  describe('1. Public Categories API', () => {
    it('GET /api/v1/categories - should return category tree structure', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/categories').expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify nested structure has subcategories and product count
      const firstCat = res.body.data[0];
      expect(firstCat).toHaveProperty('id');
      expect(firstCat).toHaveProperty('name');
      expect(firstCat).toHaveProperty('slug');
      expect(firstCat).toHaveProperty('subcategories');
      expect(firstCat).toHaveProperty('productCount');
    });

    it('GET /api/v1/categories/:slug - should return category detail for valid slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories/dairy-bakery')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('dairy-bakery');
      expect(res.body.data).toHaveProperty('name');
    });

    it('GET /api/v1/categories/:slug - should return 404 for unknown slug', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/categories/non-existent-slug-xyz')
        .expect(404);
    });
  });

  describe('2. Public Brands API', () => {
    it('GET /api/v1/brands - should return active brands', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/brands').expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('slug');
    });
  });

  describe('3. Customer Storefront Products API & Store Pricing', () => {
    it('GET /api/v1/products - should return catalog products', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);

      const firstProduct = res.body.data.items[0];
      expect(firstProduct).toHaveProperty('name');
      expect(firstProduct).toHaveProperty('slug');
      expect(firstProduct).toHaveProperty('mrp');
      expect(firstProduct).toHaveProperty('sellingPrice');
      expect(firstProduct).toHaveProperty('variants');
    });

    it('GET /api/v1/products?q=doodh - should find milk via Indian quick-commerce synonym', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products?q=doodh').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      const milkFound = res.body.data.items.some(
        (p: any) => p.name.toLowerCase().includes('milk') || p.searchTags?.includes('milk'),
      );
      expect(milkFound).toBe(true);
    });

    it('GET /api/v1/products - verify store-scoped pricing between Store 1 and Store 2', async () => {
      // Store 1: Indiranagar
      const resStore1 = await request(app.getHttpServer())
        .get('/api/v1/products?storeId=fresh-farms-indiranagar&q=Amul%20Taaza')
        .expect(200);

      // Store 2: Koramangala
      const resStore2 = await request(app.getHttpServer())
        .get('/api/v1/products?storeId=nature-fresh-koramangala&q=Amul%20Taaza')
        .expect(200);

      expect(resStore1.body.data.items.length).toBeGreaterThan(0);
      expect(resStore2.body.data.items.length).toBeGreaterThan(0);

      const p1 = resStore1.body.data.items[0];
      const p2 = resStore2.body.data.items[0];

      // Both are the same master product (same name & MRP)
      expect(p1.name).toBe(p2.name);
      expect(p1.mrp).toBe(p2.mrp);

      // Verify that store 1 selling price and store 2 selling price are correctly scoped
      // (Seed: Store 1 has 33, Store 2 has 32)
      expect(p1.sellingPrice).toBe(33);
      expect(p2.sellingPrice).toBe(32);
    });

    it('GET /api/v1/products?categoryId=... - should accept categoryId alias without 400 validation error', async () => {
      const catRes = await request(app.getHttpServer()).get('/api/v1/categories').expect(200);
      const catId = catRes.body.data[0].id;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/products?categoryId=${catId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('GET /api/v1/products/:slug - should return full product detail by slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/amul-taaza-toned-milk?storeId=fresh-farms-indiranagar')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('amul-taaza-toned-milk');
      expect(res.body.data).toHaveProperty('variants');
      expect(res.body.data.variants.length).toBeGreaterThan(0);
      expect(res.body.data).toHaveProperty('ingredients');
      expect(res.body.data).toHaveProperty('nutritionalInfo');
      expect(res.body.data).toHaveProperty('storageInstructions');
      expect(res.body.data).toHaveProperty('countryOfOrigin');
      expect(res.body.data.store).toBeDefined();
      expect(res.body.data.store.slug).toBe('fresh-farms-indiranagar');
    });

    it('GET /api/v1/products/search/suggestions - should return search autocomplete suggestions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/search/suggestions?q=amul')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('products');
      expect(res.body.data).toHaveProperty('categories');
      expect(res.body.data).toHaveProperty('brands');
      expect(Array.isArray(res.body.data.products)).toBe(true);
    });
  });

  describe('4. Admin Master Catalog Management API', () => {
    it('POST /api/v1/admin/categories - should create a new category (Admin authorized)', async () => {
      const timestamp = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          name: `Test Cat ${timestamp}`,
          slug: `test-cat-${timestamp}`,
          description: 'E2E Category description',
          displayOrder: 99,
          isActive: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe(`test-cat-${timestamp}`);
      createdCategoryId = res.body.data.id;
    });

    it('POST /api/v1/admin/categories - should reject unauthorized requests without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .send({
          name: 'Unauthorized Cat',
          slug: 'unauth-cat',
        })
        .expect(401);
    });

    it('POST /api/v1/admin/products - should create a new master product in DRAFT status', async () => {
      const timestamp = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          name: `Organic Raw Honey ${timestamp}`,
          categoryId: createdCategoryId,
          shortDescription: '100% Pure Raw Honey',
          foodPreference: 'VEG',
          countryOfOrigin: 'India',
          initialVariant: {
            name: '500g Jar',
            packSize: '500 g',
            unitValue: 500,
            unitType: 'g',
            mrp: 299,
          },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.variants.length).toBe(1);
      createdProductId = res.body.data.id;
    });

    it('PATCH /api/v1/admin/products/:id/status - should enforce validation before publishing to ACTIVE', async () => {
      // Product variant has no primary image, so publishing should be rejected
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/products/${createdProductId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'ACTIVE' })
        .expect(400);

      expect(res.body.message).toContain(
        'at least one primary product or variant image is required',
      );
    });

    it('GET /api/v1/admin/products/:id/store-listings - should inspect store listings for product', async () => {
      // Find an existing seeded product
      const productsRes = await request(app.getHttpServer()).get('/api/v1/products').expect(200);

      const seedProduct = productsRes.body.data.items[0];

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/products/${seedProduct.id}/store-listings`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const firstStore = res.body.data[0];
      expect(firstStore).toHaveProperty('sellerId');
      expect(firstStore).toHaveProperty('storeName');
      expect(firstStore).toHaveProperty('sellingPrice');
      expect(firstStore).toHaveProperty('availableStock');
    });
  });
});
