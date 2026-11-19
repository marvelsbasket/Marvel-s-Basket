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

## 8. Customer Profile & Address Management (Phase 06)

The backend provides complete customer profile management and delivery address CRUD under `/api/v1/users/*` and `/api/v1/addresses/*`:

### Features:

- **Server-Derived Identity:** Customer identity is derived exclusively from validated JWT sessions via `@CurrentUser('id')`.
- **Strict Data Isolation (No IDOR):** Cross-customer address access and modifications are strictly rejected with HTTP 404 to prevent resource enumeration.
- **Single Default Address Invariant:** Guaranteed via PostgreSQL `$transaction` operations. When a default address is deleted, the most recently updated remaining address is automatically promoted.
- **Indian Market Validations:** Delivery contacts require 10-digit mobile numbers (`^[6-9]\d{9}$`) and 6-digit PIN codes (`^\d{6}$`).

### Endpoints:

| Method   | Endpoint                        | Access        | Description                                     |
| -------- | ------------------------------- | ------------- | ----------------------------------------------- |
| `GET`    | `/api/v1/users/me`              | Authenticated | Retrieve customer profile                       |
| `PATCH`  | `/api/v1/users/me`              | Authenticated | Update name, avatar URL, and date of birth      |
| `GET`    | `/api/v1/users/me/account`      | Authenticated | Retrieve account status and total addresses     |
| `GET`    | `/api/v1/users/me/preferences`  | Authenticated | Retrieve notification and channel preferences   |
| `PATCH`  | `/api/v1/users/me/preferences`  | Authenticated | Update notification channel preferences         |
| `PATCH`  | `/api/v1/users/me/deactivate`   | Authenticated | Soft-deactivate customer account                |
| `GET`    | `/api/v1/addresses`             | Authenticated | List customer saved addresses (default first)   |
| `POST`   | `/api/v1/addresses`             | Authenticated | Add a new delivery address                      |
| `GET`    | `/api/v1/addresses/:id`         | Authenticated | Retrieve single address (ownership verified)    |
| `PATCH`  | `/api/v1/addresses/:id`         | Authenticated | Update delivery address                         |
| `DELETE` | `/api/v1/addresses/:id`         | Authenticated | Delete address with automatic default promotion |
| `PATCH`  | `/api/v1/addresses/:id/default` | Authenticated | Set address as customer default address         |

---

## 8. Customer Profile & Address Management (Phase 06)

The backend provides complete customer profile management and delivery address CRUD under `/api/v1/users/*` and `/api/v1/addresses/*`:

### Features:

- **Server-Derived Identity:** Customer identity is derived exclusively from validated JWT sessions via `@CurrentUser('id')`.
- **Strict Data Isolation (No IDOR):** Cross-customer address access and modifications are strictly rejected with HTTP 404 to prevent resource enumeration.
- **Single Default Address Invariant:** Guaranteed via PostgreSQL `$transaction` operations. When a default address is deleted, the most recently updated remaining address is automatically promoted.
- **Indian Market Validations:** Delivery contacts require 10-digit mobile numbers (`^[6-9]\d{9}$`) and 6-digit PIN codes (`^\d{6}$`).

### Endpoints:

| Method   | Endpoint                        | Access        | Description                                     |
| -------- | ------------------------------- | ------------- | ----------------------------------------------- |
| `GET`    | `/api/v1/users/me`              | Authenticated | Retrieve customer profile                       |
| `PATCH`  | `/api/v1/users/me`              | Authenticated | Update name, avatar URL, and date of birth      |
| `GET`    | `/api/v1/users/me/account`      | Authenticated | Retrieve account status and total addresses     |
| `GET`    | `/api/v1/users/me/preferences`  | Authenticated | Retrieve notification and channel preferences   |
| `PATCH`  | `/api/v1/users/me/preferences`  | Authenticated | Update notification channel preferences         |
| `PATCH`  | `/api/v1/users/me/deactivate`   | Authenticated | Soft-deactivate customer account                |
| `GET`    | `/api/v1/addresses`             | Authenticated | List customer saved addresses (default first)   |
| `POST`   | `/api/v1/addresses`             | Authenticated | Add a new delivery address                      |
| `GET`    | `/api/v1/addresses/:id`         | Authenticated | Retrieve single address (ownership verified)    |
| `PATCH`  | `/api/v1/addresses/:id`         | Authenticated | Update delivery address                         |
| `DELETE` | `/api/v1/addresses/:id`         | Authenticated | Delete address with automatic default promotion |
| `PATCH`  | `/api/v1/addresses/:id/default` | Authenticated | Set address as customer default address         |
