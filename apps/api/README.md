# Marvel's Basket — Backend API Architecture (`@marvels-basket/api`)

Production-grade modular monolith backend for **Marvel's Basket**, built on **NestJS 10**, **TypeScript**, **PostgreSQL 16**, **Prisma ORM**, and **Redis 7**.

---

## 1. Directory Structure

```text
apps/api/src/
├── common/                  # Cross-cutting API infrastructure
│   ├── constants/           # Global metadata keys, HTTP headers, ErrorCode enum
│   ├── decorators/          # @BypassTransform(), @ResponseMessage(), @Public()
│   ├── filters/             # AllExceptionsFilter (centralized error formatting)
│   ├── interceptors/        # TransformInterceptor (envelope), LoggingInterceptor (audit)
│   ├── interfaces/          # ApiSuccessResponse, ApiErrorResponse, FieldError
│   ├── middleware/          # CorrelationIdMiddleware (UUID v4 propagation)
│   └── pipes/               # validationExceptionFactory (formatted field errors)
│
├── config/                  # Centralized typed configuration
│   ├── config.interface.ts  # RootConfig interface
│   ├── configuration.ts     # Configuration factory
│   └── validation.schema.ts # Joi environment validation schema
│
├── database/                # Database abstraction
│   ├── prisma.service.ts    # Extended PrismaClient with connection hooks & health probe
│   └── prisma.module.ts     # Global PrismaModule
│
├── cache/                   # High-speed Redis caching & session store
│   ├── redis.service.ts     # ioredis client lifecycle, ping probe, get/set/del
│   └── redis.module.ts      # Global RedisModule
│
├── health/                  # Health monitoring & probes
│   ├── health.controller.ts # Endpoints: /health, /health/live, /health/ready
│   ├── health.service.ts    # Infrastructure probe coordinator
│   └── health.module.ts     # HealthModule
│
├── app.module.ts            # Root application module with global providers
└── main.ts                  # Application bootstrap, Swagger, security, pipes
```

---

## 2. API Conventions & Standards

### Base URL & Versioning

- **Global Route Prefix:** `/api`
- **URI Versioning:** `v1`
- **Full Base Path:** `http://localhost:4000/api/v1`

### Standard Success Response Envelope

All non-bypassed endpoints return:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request completed successfully",
  "data": { ... },
  "timestamp": "2026-11-19T07:20:47.255Z",
  "path": "/api/v1/health",
  "correlationId": "ff793162-7859-4987-b2f3-03165d717769"
}
```

### Standard Error Response Envelope

All caught exceptions return:

```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "errors": [
    {
      "field": "email",
      "message": "email must be an email"
    }
  ],
  "timestamp": "2026-11-19T07:20:47.312Z",
  "path": "/api/v1/example",
  "correlationId": "c7f0caa2-99be-4775-ad80-b3d95038ad2c"
}
```

### Correlation ID (`x-correlation-id`)

- Every incoming request is assigned a unique UUID v4 correlation ID (or validates an incoming `x-correlation-id` header).
- Attached to response headers and included in structured application logs.

---

## 3. Core Endpoints

| Method | Endpoint               | Description                                                | Public      |
| ------ | ---------------------- | ---------------------------------------------------------- | ----------- |
| `GET`  | `/api/v1/health`       | Overall system health summary, uptime, and memory          | Yes         |
| `GET`  | `/api/v1/health/live`  | Process liveness probe for container orchestrators         | Yes         |
| `GET`  | `/api/v1/health/ready` | Readiness probe checking PostgreSQL and Redis connectivity | Yes         |
| `GET`  | `/api/docs`            | Swagger UI interactive API documentation                   | Development |
| `GET`  | `/api/docs-json`       | OpenAPI 3.0.0 JSON specification                           | Development |

---

## 4. Module Development Guidelines

When introducing new business modules in future phases (e.g. `src/modules/sellers/`), follow this pattern:

```text
src/modules/feature/
├── dto/
│   ├── create-feature.dto.ts
│   └── update-feature.dto.ts
├── feature.controller.ts     # Thin controller, request parsing, Swagger tags
├── feature.service.ts        # Business logic, Prisma/Redis interaction
├── feature.module.ts         # Module definition
└── feature.service.spec.ts   # Unit tests
```

- **DTOs:** Always validate incoming payloads using `class-validator` and `class-transformer`.
- **Controllers:** Do not access the database directly; delegate exclusively to services.
- **Custom Response Message:** Use `@ResponseMessage('Custom message')` on controller methods.
- **Bypass Response Envelope:** Use `@BypassTransform()` for file downloads or stream endpoints.

---

## 5. Testing Commands

```bash
# Run unit tests
npm run test --workspace=@marvels-basket/api

# Run E2E tests
npm run test:e2e --workspace=@marvels-basket/api

# Run database integrity and marketplace invariant tests
npm run test:db --workspace=@marvels-basket/api

# Run tests with coverage
npm run test:cov --workspace=@marvels-basket/api
```

---

## 6. Database Schema & Migration Workflow

The database is built on **PostgreSQL 16** and **Prisma ORM 5.22**, implementing 54 relational domain models, 21 enums, and comprehensive business constraints.

- **Schema definition:** `prisma/schema.prisma`
- **Migrations directory:** `prisma/migrations/`
- **Seed script:** `prisma/seed.ts`
- **Integrity test suite:** `test/database-integrity.db-spec.ts`

### Database Scripts:

```bash
# Generate Prisma Client
npm run db:generate

# Validate and format schema
npm run db:validate
npm run db:format

# Run development migrations
npm run db:migrate

# Apply migrations in CI / production
npm run db:migrate:deploy

# Run deterministic development seed
npm run db:seed

# Inspect migration status
npm run db:status

# Run database integrity test suite
npm run test:db
```

---

## 7. Authentication & Authorization (Phase 04)

The backend provides a complete, production-ready authentication and authorization system under `/api/v1/auth/*`:

### Features:

- **Argon2id Password Hashing:** Robust memory-hard hashing (`memoryCost: 65536, timeCost: 3, parallelism: 4`) with timing attack mitigation.
- **Email Verification via Resend:** Cryptographically secure 6-digit numeric OTPs dispatched via Resend. Hashed with SHA-256 in Redis with a 5-minute TTL, 60-second cooldown, and 5-attempt brute-force protection.
- **Unverified Account Auto-Recovery:** Automatic OTP regeneration and dispatch whenever an unverified user registers again (Scenario A) or logs in with valid credentials (Scenario B, enforcing Argon2id password-check-first). Eliminates dead ends and duplicate account creation.
- **Development OTP Logging:** In `NODE_ENV=development`, verification OTPs are printed in an easily readable terminal banner when `DEV_LOG_EMAIL_OTP=true` and `DEV_SEND_REAL_EMAILS=false`. Suppressed in production.
- **Dual-Token Session Management:** Short-lived access JWT (15m) + rotating refresh token (7d) transported in secure `HttpOnly`, `SameSite=lax` cookies.
- **RFC 6749 Token Rotation & Reuse Detection:** Rotated sessions are tracked via `token_family_id`. Replay attacks on old refresh tokens trigger immediate invalidation of all sessions in the token family.
- **Declarative Global RBAC:** Global `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard` with `@Public()` decorator bypass on public routes.

### Endpoints:

| Method | Endpoint                               | Access        | Description                                   |
| ------ | -------------------------------------- | ------------- | --------------------------------------------- |
| `POST` | `/api/v1/auth/register`                | Public        | Register customer account & send email OTP    |
| `POST` | `/api/v1/auth/verify-email`            | Public        | Verify email address with 6-digit OTP         |
| `POST` | `/api/v1/auth/resend-verification-otp` | Public        | Resend email OTP (60s cooldown)               |
| `POST` | `/api/v1/auth/login`                   | Public        | Authenticate user; returns JWT & sets cookie  |
| `POST` | `/api/v1/auth/refresh`                 | Public        | Rotate refresh token and issue new token pair |
| `POST` | `/api/v1/auth/logout`                  | Public        | Invalidate current session and clear cookie   |
| `POST` | `/api/v1/auth/logout-all`              | Authenticated | Terminate all active sessions across devices  |
| `POST` | `/api/v1/auth/forgot-password`         | Public        | Request single-use password reset link        |
| `POST` | `/api/v1/auth/reset-password`          | Public        | Reset password using verified crypto token    |
| `GET`  | `/api/v1/auth/me`                      | Authenticated | Retrieve profile, roles, and permissions      |

---

## 9. Seller Onboarding, KYC & Administration (Phase 07)

The backend provides complete seller onboarding, document verification, and store lifecycle management under `/api/v1/sellers/*` and `/api/v1/admin/sellers/*`:

### Features:

- **Incremental Onboarding & Draft Saving:** Auto-saves progress across 5 steps with real-time draft resumption.
- **AES-256-GCM Bank Encryption:** Bank account numbers are encrypted at rest with master hex key; API responses return masked numbers (`••••••••1234`).
- **Cloudinary Authenticated KYC Storage:** Uploads identity and tax documents as private assets, generates time-limited signed preview URLs.
- **5-State Lifecycle State Machine:** Enforces `DRAFT` ➔ `PENDING_VERIFICATION` ➔ `APPROVED_ACTIVE` | `REJECTED` | `SUSPENDED`.
- **Atomic Store Activation:** Approving a seller activates their store and assigns the `SELLER` role to the user account in an atomic transaction.
- **In-App Document Inspection:** Administrators review documents inside the application with individual document review notes.
- **Transactional Notifications:** Resend email integration for application submission, approval, rejection with correction notes, suspension, and reactivation.

### Endpoints:

| Method   | Endpoint                                             | Access                         | Description                                          |
| -------- | ---------------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `GET`    | `/api/v1/sellers/application`                        | Authenticated                  | Retrieve current user's seller application draft     |
| `POST`   | `/api/v1/sellers/application`                        | Authenticated                  | Initialize or retrieve seller application            |
| `PATCH`  | `/api/v1/sellers/application`                        | Authenticated                  | Update onboarding draft across steps 1–5             |
| `POST`   | `/api/v1/sellers/application/submit`                 | Authenticated                  | Submit complete application for admin review         |
| `GET`    | `/api/v1/sellers/status`                             | Authenticated                  | Check application status and feedback notes          |
| `POST`   | `/api/v1/sellers/documents`                          | Authenticated                  | Upload KYC document to Cloudinary authenticated      |
| `DELETE` | `/api/v1/sellers/documents/:id`                      | Authenticated                  | Delete uploaded KYC document before final submission |
| `GET`    | `/api/v1/sellers/profile`                            | Authenticated (`SELLER`)       | Retrieve operational store profile                   |
| `PATCH`  | `/api/v1/sellers/profile`                            | Authenticated (`SELLER`)       | Update operational store profile                     |
| `GET`    | `/api/v1/sellers/store`                              | Authenticated (`SELLER`)       | Retrieve operational store settings                  |
| `PATCH`  | `/api/v1/sellers/store`                              | Authenticated (`SELLER`)       | Update operational store settings                    |
| `GET`    | `/api/v1/admin/sellers`                              | Admin (`ADMIN`, `SUPER_ADMIN`) | List seller applications with filters & pagination   |
| `GET`    | `/api/v1/admin/sellers/:id`                          | Admin (`ADMIN`, `SUPER_ADMIN`) | Get detailed application dossier with documents      |
| `POST`   | `/api/v1/admin/sellers/:id/documents/:docId/review`  | Admin (`ADMIN`, `SUPER_ADMIN`) | Review individual document (VERIFIED, REJECTED)      |
| `GET`    | `/api/v1/admin/sellers/:id/documents/:docId/preview` | Admin (`ADMIN`, `SUPER_ADMIN`) | Generate signed URL for in-app document preview      |
| `POST`   | `/api/v1/admin/sellers/:id/approve`                  | Admin (`ADMIN`, `SUPER_ADMIN`) | Approve application & activate store + SELLER role   |
| `POST`   | `/api/v1/admin/sellers/:id/reject`                   | Admin (`ADMIN`, `SUPER_ADMIN`) | Reject application with merchant correction notes    |
| `POST`   | `/api/v1/admin/sellers/:id/suspend`                  | Admin (`ADMIN`, `SUPER_ADMIN`) | Suspend active store & deactivate listings           |
| `POST`   | `/api/v1/admin/sellers/:id/reactivate`               | Admin (`ADMIN`, `SUPER_ADMIN`) | Reactivate suspended store                           |

---

## 9. Seller Onboarding, KYC & Administration (Phase 07)

The backend provides complete seller onboarding, document verification, and store lifecycle management under `/api/v1/sellers/*` and `/api/v1/admin/sellers/*`:

### Features:

- **Incremental Onboarding & Draft Saving:** Auto-saves progress across 5 steps with real-time draft resumption.
- **AES-256-GCM Bank Encryption:** Bank account numbers are encrypted at rest with master hex key; API responses return masked numbers (`••••••••1234`).
- **Cloudinary Authenticated KYC Storage:** Uploads identity and tax documents as private assets, generates time-limited signed preview URLs.
- **5-State Lifecycle State Machine:** Enforces `DRAFT` ➔ `PENDING_VERIFICATION` ➔ `APPROVED_ACTIVE` | `REJECTED` | `SUSPENDED`.
- **Atomic Store Activation:** Approving a seller activates their store and assigns the `SELLER` role to the user account in an atomic transaction.
- **In-App Document Inspection:** Administrators review documents inside the application with individual document review notes.
- **Transactional Notifications:** Resend email integration for application submission, approval, rejection with correction notes, suspension, and reactivation.

### Endpoints:

| Method   | Endpoint                                             | Access                         | Description                                          |
| -------- | ---------------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `GET`    | `/api/v1/sellers/application`                        | Authenticated                  | Retrieve current user's seller application draft     |
| `POST`   | `/api/v1/sellers/application`                        | Authenticated                  | Initialize or retrieve seller application            |
| `PATCH`  | `/api/v1/sellers/application`                        | Authenticated                  | Update onboarding draft across steps 1–5             |
| `POST`   | `/api/v1/sellers/application/submit`                 | Authenticated                  | Submit complete application for admin review         |
| `GET`    | `/api/v1/sellers/status`                             | Authenticated                  | Check application status and feedback notes          |
| `POST`   | `/api/v1/sellers/documents`                          | Authenticated                  | Upload KYC document to Cloudinary authenticated      |
| `DELETE` | `/api/v1/sellers/documents/:id`                      | Authenticated                  | Delete uploaded KYC document before final submission |
| `GET`    | `/api/v1/sellers/profile`                            | Authenticated (`SELLER`)       | Retrieve operational store profile                   |
| `PATCH`  | `/api/v1/sellers/profile`                            | Authenticated (`SELLER`)       | Update operational store profile                     |
| `GET`    | `/api/v1/sellers/store`                              | Authenticated (`SELLER`)       | Retrieve operational store settings                  |
| `PATCH`  | `/api/v1/sellers/store`                              | Authenticated (`SELLER`)       | Update operational store settings                    |
| `GET`    | `/api/v1/admin/sellers`                              | Admin (`ADMIN`, `SUPER_ADMIN`) | List seller applications with filters & pagination   |
| `GET`    | `/api/v1/admin/sellers/:id`                          | Admin (`ADMIN`, `SUPER_ADMIN`) | Get detailed application dossier with documents      |
| `POST`   | `/api/v1/admin/sellers/:id/documents/:docId/review`  | Admin (`ADMIN`, `SUPER_ADMIN`) | Review individual document (VERIFIED, REJECTED)      |
| `GET`    | `/api/v1/admin/sellers/:id/documents/:docId/preview` | Admin (`ADMIN`, `SUPER_ADMIN`) | Generate signed URL for in-app document preview      |
| `POST`   | `/api/v1/admin/sellers/:id/approve`                  | Admin (`ADMIN`, `SUPER_ADMIN`) | Approve application & activate store + SELLER role   |
| `POST`   | `/api/v1/admin/sellers/:id/reject`                   | Admin (`ADMIN`, `SUPER_ADMIN`) | Reject application with merchant correction notes    |
| `POST`   | `/api/v1/admin/sellers/:id/suspend`                  | Admin (`ADMIN`, `SUPER_ADMIN`) | Suspend active store & deactivate listings           |
| `POST`   | `/api/v1/admin/sellers/:id/reactivate`               | Admin (`ADMIN`, `SUPER_ADMIN`) | Reactivate suspended store                           |

---

## 10. Development Email OTP Visibility (Local Convenience)

To enable frictionless local development and end-to-end user verification without requiring live transactional email delivery or third-party quota consumption, the backend provides terminal OTP logging:

### Configuration:

```env
# Email OTP Verification
EMAIL_OTP_ENABLED=true

# Development-only Terminal OTP Visibility
DEV_LOG_EMAIL_OTP=true

# Optional: Send live emails during development via Resend
DEV_SEND_REAL_EMAILS=false
```

### Terminal Output Format:

When a verification code is requested in development, the OTP is printed directly to stdout:

```text
==================================================
[DEV EMAIL OTP]
Purpose: Email Verification
Email: developer@example.com
OTP: 483921
Expires At: 2026-11-20 09:35:00
==================================================
```

### Security Safeguards:

- **Strict Production Guard:** Under `NODE_ENV=production`, `DEV_LOG_EMAIL_OTP` is unconditionally ignored and forced to `false`. OTPs are never printed in logs or exposed in API responses.
- **Uncompromised Security Policy:** Full Argon2id hashing, SHA-256 Redis OTP hashing, 5-minute TTL, 60-second cooldown, and max 5 failed attempts lockout remain fully active.

---

## 10. Development Email OTP Visibility (Local Convenience)

To enable frictionless local development and end-to-end user verification without requiring live transactional email delivery or third-party quota consumption, the backend provides terminal OTP logging:

### Configuration:

```env
# Email OTP Verification
EMAIL_OTP_ENABLED=true

# Development-only Terminal OTP Visibility
DEV_LOG_EMAIL_OTP=true

# Optional: Send live emails during development via Resend
DEV_SEND_REAL_EMAILS=false
```

### Terminal Output Format:

When a verification code is requested in development, the OTP is printed directly to stdout:

```text
==================================================
[DEV EMAIL OTP]
Purpose: Email Verification
Email: developer@example.com
OTP: 483921
Expires At: 2026-11-20 09:35:00
==================================================
```

### Security Safeguards:

- **Strict Production Guard:** Under `NODE_ENV=production`, `DEV_LOG_EMAIL_OTP` is unconditionally ignored and forced to `false`. OTPs are never printed in logs or exposed in API responses.
- **Uncompromised Security Policy:** Full Argon2id hashing, SHA-256 Redis OTP hashing, 5-minute TTL, 60-second cooldown, and max 5 failed attempts lockout remain fully active.
