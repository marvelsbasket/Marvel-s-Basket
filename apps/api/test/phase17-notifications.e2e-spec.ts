import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

describe('Phase 17 — Notifications (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let notificationsService: NotificationsService;
  let configService: ConfigService;

  const runId = Date.now();
  let cust1Id: string;
  let cust1Token: string;
  let cust2Token: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    notificationsService = app.get(NotificationsService);
    configService = app.get(ConfigService);

    const accessSecret = configService.get<string>('jwt.accessSecret');

    const [custRole, adminRole] = await Promise.all([
      prisma.role.upsert({
        where: { name: 'CUSTOMER' },
        update: {},
        create: { name: 'CUSTOMER', roleType: UserRoleType.CUSTOMER, description: 'Customer' },
      }),
      prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: { name: 'ADMIN', roleType: UserRoleType.ADMIN, description: 'Admin' },
      }),
    ]);

    const [c1, c2, adm] = await Promise.all([
      prisma.user.create({
        data: {
          email: `p17-c1-${runId}@test.com`,
          name: 'P17 Customer One',
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          userRoles: { create: { roleId: custRole.id } },
        },
      }),
      prisma.user.create({
        data: {
          email: `p17-c2-${runId}@test.com`,
          name: 'P17 Customer Two',
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          userRoles: { create: { roleId: custRole.id } },
        },
      }),
      prisma.user.create({
        data: {
          email: `p17-admin-${runId}@test.com`,
          name: 'P17 Admin',
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          userRoles: { create: { roleId: adminRole.id } },
        },
      }),
    ]);

    cust1Id = c1.id;
    cust1Token = jwtService.sign(
      { sub: c1.id, email: c1.email, roles: ['CUSTOMER'] },
      { secret: accessSecret },
    );
    cust2Token = jwtService.sign(
      { sub: c2.id, email: c2.email, roles: ['CUSTOMER'] },
      { secret: accessSecret },
    );
    adminToken = jwtService.sign(
      { sub: adm.id, email: adm.email, roles: ['ADMIN'] },
      { secret: accessSecret },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('dispatches outbox notifications idempotently, enforces preferences & IDOR isolation, and tracks admin deliveries', async () => {
    const idempKey = `p17-e2e-order-${runId}`;

    // 1. Record & process outbox event directly (and repeat with same idempotencyKey)
    const evt = await notificationsService.recordOutboxEventInTx(prisma, {
      eventKey: 'ORDER_PLACED_CUSTOMER',
      aggregateType: 'Order',
      aggregateId: `order-${runId}`,
      recipientUserId: cust1Id,
      idempotencyKey: idempKey,
      payload: {
        orderId: `order-${runId}`,
        orderNumber: `MB-P17-${runId}`,
        storeName: 'Green Mart',
        totalAmount: 350,
        actionUrl: `/orders/order-${runId}`,
      },
    });

    await notificationsService.processOutboxEvent(evt.id);
    // Repeat processing must remain idempotent
    await notificationsService.processOutboxEvent(evt.id);

    // 2. Customer 1 sees 1 notification and unreadCount = 1
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${cust1Token}`)
      .expect(200);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.unreadCount).toBe(1);
    const notifId = listRes.body.items[0].id;

    // 3. Cross-user IDOR blocked (404) & customer blocked from admin/seller endpoints (403)
    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${cust2Token}`)
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/v1/admin/notifications/health')
      .set('Authorization', `Bearer ${cust1Token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/seller/notifications')
      .set('Authorization', `Bearer ${cust1Token}`)
      .expect(403);

    // 4. Customer 1 marks notification read & verifies unreadCount = 0
    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${cust1Token}`)
      .expect(200);

    const unreadRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${cust1Token}`)
      .expect(200);
    expect(unreadRes.body.unreadCount).toBe(0);

    // 5. Preference enforcement: opt out of PROMOTION EMAIL, verify delivery is SKIPPED
    await request(app.getHttpServer())
      .patch('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({
        categories: [
          {
            category: NotificationType.PROMOTION,
            channel: NotificationChannel.EMAIL,
            isEnabled: false,
          },
        ],
      })
      .expect(200);

    const promoEvt = await notificationsService.recordOutboxEventInTx(prisma, {
      eventKey: 'PROMOTION_ANNOUNCEMENT',
      aggregateType: 'Promotion',
      aggregateId: `promo-${runId}`,
      recipientUserId: cust1Id,
      idempotencyKey: `p17-e2e-promo-${runId}`,
      payload: {
        title: 'Weekend Offer',
        message: 'Fresh produce deals this weekend',
        actionUrl: '/',
      },
    });
    await notificationsService.processOutboxEvent(promoEvt.id);

    const promoEmailDelivery = await prisma.notificationDelivery.findFirst({
      where: {
        outboxEventId: promoEvt.id,
        channel: NotificationChannel.EMAIL,
      },
    });
    expect(promoEmailDelivery?.status).toBe(NotificationDeliveryStatus.SKIPPED);

    // 6. Admin delivery monitoring & health check
    const adminHealth = await request(app.getHttpServer())
      .get('/api/v1/admin/notifications/health')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(adminHealth.body.enabled).toBe(true);

    const adminDeliveries = await request(app.getHttpServer())
      .get('/api/v1/admin/notifications/deliveries')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(adminDeliveries.body.items.length).toBeGreaterThanOrEqual(2);

    // 7. Forged Resend webhook rejected (401)
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/resend')
      .set('svix-id', 'msg_1')
      .set('svix-timestamp', String(Math.floor(Date.now() / 1000)))
      .set('svix-signature', 'v1,forged')
      .send({ type: 'email.delivered', data: { email_id: 'nonexistent' } })
      .expect(401);
  });
});
