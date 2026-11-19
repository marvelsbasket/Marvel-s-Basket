# IMPLEMENTATION_PHASES.md

# Marvel's Basket — Phased Implementation Roadmap

**Project:** Marvel's Basket  
**Organization:** Marvel's Techworks  
**Document Version:** 1.0  
**Status:** Proposed Implementation Roadmap  
**Last Updated:** 19 November 2026

---

# 1. Roadmap Overview

Marvel's Basket will be developed in structured implementation phases.

Each phase must have:
- Clearly defined objectives.
- Specific development tasks.
- Expected deliverables.
- Dependencies.
- Testing requirements.
- Completion criteria.

The project will follow an incremental development approach. Each phase should establish a stable foundation for the next phase.

## 1.1 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Architecture | Monorepo |
| Frontend Directory | `apps/web` |
| Backend Directory | `apps/api` |

## 1.2 Proposed Development Phases

| Phase | Name | Priority |
|---|---|---|
| 00 | Business Rules & Technical Finalization | Critical |
| 01 | Monorepo & Development Environment Setup | Critical |
| 02 | Backend Foundation | Critical |
| 03 | Database Implementation | Critical |
| 04 | Authentication & Authorization | Critical |
| 05 | Frontend Foundation & Design System | High |
| 06 | User & Profile Management | High |
| 07 | Seller Onboarding & Management | High |
| 08 | Product Catalog & Categories | High |
| 09 | Seller Listings & Inventory | High |
| 10 | Customer Shopping Experience | High |
| 11 | Cart & Checkout | Critical |
| 12 | Order Management | Critical |
| 13 | Payment Integration | Critical |
| 14 | Delivery & Fulfillment | High |
| 15 | Coupons, Discounts & Promotions | Medium |
| 16 | Reviews & Ratings | Medium |
| 17 | Notifications | Medium |
| 18 | Seller Dashboard | High |
| 19 | Admin Dashboard | High |
| 20 | Financial Management & Settlements | High |
| 21 | Testing & Security Hardening | Critical |
| 22 | Deployment & Production Launch | Critical |
| 23 | Post-Launch Monitoring & Optimization | High |

**Note:** The phase order is a proposed dependency-based roadmap. Some independent features can be developed in parallel after their dependencies are stable.

---

# 2. Phase 00 — Business Rules & Technical Finalization

**Priority:** Critical  
**Status:** In Progress (Architecture & Baseline Documentation Finalized; Awaiting Owner Sign-Off on Pending Parameters)

### Objective

Finalize the business model and important technical decisions before implementing dependent features.

### Tasks

- [x] Confirm marketplace product ownership model (Aggregator / Hybrid Model).
- [x] Confirm single-seller or multi-seller checkout (Single-Store Checkout for MVP).
- [x] Finalize delivery responsibility (Platform-Managed Delivery with modular provider abstraction).
- [x] Finalize payment methods (Razorpay UPI/Cards/Netbanking + COD with risk controls).
- [x] Select payment provider (Razorpay standard gateway; Route deferred).
- [x] Define seller onboarding and approval (`DRAFT -> PENDING -> UNDER_REVIEW -> APPROVED / REJECTED` + `SUSPENDED`).
- [x] Define commission and settlement rules (Category-based 10%–18% baseline; T+3 settlement cycle; double-entry ledger).
- [x] Define cancellation and refund policies (Free pre-pack; restricted post-pack; locked in transit; source refunds).
- [x] Define pricing and discount rules (Store selling price <= MRP; platform coupons vs store discounts).
- [x] Finalize authentication methods (Phone OTP for Customers/Riders; Email/Password + JWT for Sellers/Admins).
- [x] Confirm deployment approach (Containerized Modular Monolith on Render/AWS).
- [x] Review and update `DATABASE_SCHEMA.md` (Single-store order, webhooks, seller ledger, delivery tracking).
- [x] Update `PROJECT_REQUIREMENTS.md` (Locked MVP scope, business rules BR-001 to BR-022).
- [x] Update `TECHNICAL_ARCHITECTURE.md` (System diagrams, atomic reservation, payment verification).
- [x] Update `PROJECT_DECISIONS.md` (ADR-001 through ADR-016 recorded).
- [ ] Receive project owner formal sign-off on outstanding commercial parameters.

### Deliverables

- Validated business rules & MVP scope specification.
- Approved technical baseline architecture.
- Validated single-store relational database design.
- Complete Architecture Decision Record (ADR) register.

### Completion Criteria

No critical business rule should remain ambiguous when implementation of the dependent feature begins. Complete Phase 00 sign-off is achieved upon business owner confirmation of the remaining commercial parameters.

---

# 3. Phase 01 — Monorepo & Development Environment Setup

**Priority:** Critical  
**Status:** Completed  
**Completed Date:** 19 November 2026

### Objective

Establish a production-oriented, scalable monorepo and standardized development environment for Marvel's Basket with centralized root-level Docker orchestration.

### Approved Monorepo Directory Structure

```text
marvels-basket/
│
├── apps/
│   ├── web/                     # Next.js 15 customer web storefront (@marvels-basket/web)
│   └── api/                     # NestJS backend API modular monolith (@marvels-basket/api)
│
├── packages/
│   └── shared/                  # Shared domain types, constants, enums (@marvels-basket/shared)
│
├── infrastructure/
│   └── docker/                  # Centralized Docker Compose infrastructure
│       ├── compose.yaml         # Base PostgreSQL 16 & Redis 7 definitions
│       ├── compose.override.yaml# Local development port bindings (5433, 6380)
│       ├── compose.production.yaml # Production deployment reference profile
│       ├── postgres/init/       # Automated DB init script (UUID/pgcrypto extensions)
│       └── redis/redis.conf     # Redis AOF persistence and memory limits
│
├── scripts/
│   ├── docker/                  # Centralized Docker lifecycle scripts (manage.js)
│   └── development/             # Workspace maintenance and cleanup scripts (clean.js)
│
├── docs/                        # Complete architecture and governance documentation
├── .github/workflows/ci.yaml    # Automated GitHub Actions continuous integration pipeline
├── package.json                 # npm Workspaces monorepo manifest and root control scripts
├── tsconfig.base.json           # Shared strict TypeScript base configuration
├── eslint.config.mjs            # Flat ESLint configuration
├── .prettierrc.json             # Code formatting rules
├── .gitignore                   # Git exclusion rules
├── .dockerignore                # Container build context exclusion rules
└── README.md                    # Root project quickstart and operations guide
```

### Tasks

- [x] Create Git repository and configure branch structure.
- [x] Initialize npm Workspaces monorepo (`apps/*`, `packages/*`).
- [x] Configure TypeScript base configuration (`tsconfig.base.json`).
- [x] Configure ESLint 9 (Flat Config) across monorepo workspaces.
- [x] Configure Prettier and EditorConfig for code style consistency.
- [x] Create centralized Docker infrastructure in `infrastructure/docker/` (PostgreSQL 16, Redis 7).
- [x] Configure persistent named volumes (`marvels_basket_postgres_data`, `marvels_basket_redis_data`).
- [x] Configure isolated bridge network (`marvels_basket_network`).
- [x] Implement root-level Docker management interface (`npm run docker:*`) via `scripts/docker/manage.js`.
- [x] Protect against accidental data deletion during shutdown; safeguard `docker:reset` with confirmation.
- [x] Initialize Next.js 15 application in `apps/web` with Design System visual tokens and responsive layout.
- [x] Initialize NestJS modular monolith in `apps/api` with `/api/v1` prefix and working `/health` endpoint.
- [x] Initialize shared package in `packages/shared` with domain enums, constants, and types.
- [x] Configure Prisma ORM baseline in `apps/api` and verify containerized database synchronization.
- [x] Create canonical `.env.example` templates across root, applications, and Docker.
- [x] Create GitHub Actions CI workflow (`.github/workflows/ci.yaml`).
- [x] Create comprehensive root `README.md` and Docker `README.md`.
- [x] Verify independent application builds (`build:shared`, `build:api`, `build:web`).
- [x] Verify verification pipeline (`npm run check`: format:check, lint, typecheck, build).

### Deliverables

- Working npm Workspaces monorepo with centralized root control point.
- Running and building Next.js 15 customer web application.
- Running and building NestJS backend API application with working health check.
- Compiled shared package with cross-cutting domain definitions.
- Centralized containerized PostgreSQL 16 and Redis 7 services with verified data persistence.
- Complete documentation suite updated.

### Completion Criteria

Both applications build and run successfully from the monorepo root, Docker infrastructure manages all services centrally, and all verification checks pass. Verified on 19 November 2026.

---

# 4. Phase 02 — Backend Foundation

**Priority:** Critical  
**Status:** Completed  
**Completed Date:** 19 November 2026

### Objective

Establish a scalable, maintainable, secure, and production-oriented NestJS backend architecture for Marvel's Basket.

### Approved Module Structure

```text
apps/api/src/
│
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

### Tasks

- [x] Configure application bootstrap with async startup and graceful shutdown hooks.
- [x] Configure global validation with `ValidationPipe` and custom formatted field errors.
- [x] Configure centralized exception handling with `AllExceptionsFilter`.
- [x] Establish standard API response conventions with `TransformInterceptor` and `@BypassTransform()`.
- [x] Configure typed environment configuration with strict Joi validation.
- [x] Configure CORS and Helmet security HTTP headers.
- [x] Configure URI API versioning (`/api/v1/*`).
- [x] Add structured request logging with sensitive field masking and UUID v4 correlation IDs.
- [x] Add dual-probe health monitoring (`/health/live` and `/health/ready` checking PostgreSQL and Redis).
- [x] Establish global Prisma database service and Redis caching service.
- [x] Establish feature-module development conventions and DTO patterns.
- [x] Configure Swagger/OpenAPI documentation (`/api/docs` and `/api/docs-json`).
- [x] Establish unit and E2E testing suites (Jest + Supertest).

### Deliverables

- Structured NestJS modular monolith backend application.
- Standardized API response and error envelopes with correlation tracking.
- Centralized exception filter mapping HTTP, validation, and database errors.
- Fail-fast Joi environment validation.
- Dual-probe health check monitoring PostgreSQL and Redis connectivity.
- Encapsulated Prisma and Redis services with lifecycle hooks.
- Interactive Swagger UI documentation at `/api/docs` and OpenAPI JSON at `/api/docs-json`.
- Automated unit and E2E test suites with 100% pass rate.

### Completion Criteria

The backend starts reliably, validates incoming requests, handles errors centrally, exposes documented health and Swagger endpoints, and passes all unit, E2E, lint, and build checks. Verified on 19 November 2026.

---

# 5. Phase 03 — Database Implementation

**Priority:** Critical  
**Status:** Completed

### Objective

Implement the approved PostgreSQL database design using Prisma.

### Tasks

- [x] Configure PostgreSQL.
- [x] Configure Prisma.
- [x] Create initial Prisma schema.
- [x] Implement approved enums.
- [x] Implement user models.
- [x] Implement seller models.
- [x] Implement product and category models.
- [x] Implement listing and inventory models.
- [x] Implement cart models.
- [x] Implement order models.
- [x] Implement payment and refund models.
- [x] Implement delivery models.
- [x] Implement commission and settlement models.
- [x] Implement notification models.
- [x] Implement audit models.
- [x] Add indexes and constraints.
- [x] Generate Prisma Client.
- [x] Create initial migration.
- [x] Prepare development seed data.
- [x] Test important relationships and constraints.

### Deliverables

- Approved Prisma schema (`apps/api/prisma/schema.prisma`).
- PostgreSQL database (54 relational tables, 21 enums).
- Versioned migrations (`20261119074339_init`, `20261119074630_role_and_payment_enums`, `20261119075000_seller_product_null_variant_unique`).
- Seed scripts (`apps/api/prisma/seed.ts` with idempotent development seed).
- Database access layer (`PrismaService` & `@prisma/client`).
- Database integrity test suite (`apps/api/test/database-integrity.db-spec.ts` - 10/10 tests passed).
- Root database commands (`npm run db:*`).

### Completion Criteria

All approved models and relationships migrate successfully and pass database integrity tests. Verified on 19 November 2026.

---

# 6. Phase 04 — Authentication & Authorization

**Priority:** Critical  
**Status:** **Completed** (Verified on 19 November 2026)

### Objective

Implement a complete, secure, production-ready authentication and authorization foundation for Marvel's Basket adhering to strict security standards, dual-token JWT/HttpOnly session handling, email OTP verification via Resend, and granular Role-Based Access Control (RBAC).

### Verified Tasks

- [x] Installed and configured NestJS 10-compatible authentication dependencies (`@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `argon2`, `resend`, `cookie-parser`).
- [x] Configured environment validation for JWT secret keys, token expirations, and Resend email credentials.
- [x] Added `token_family_id` column to PostgreSQL `sessions` table and applied migration `20261119081743_session_token_family`.
- [x] Built responsive, branded email templates (`verification-otp` and `password-reset`) in `apps/api/src/modules/email/`.
- [x] Built `EmailService` integrating official Resend Node SDK with automated mock/sandbox fallback.
- [x] Implemented Argon2id password hashing (`memoryCost: 65536, timeCost: 3, parallelism: 4`) with timing attack protection.
- [x] Implemented registration with mandatory customer role assignment (`UserRoleType.CUSTOMER`), customer profile, and empty cart creation.
- [x] Implemented single-use 6-digit numeric email verification OTPs (`crypto.randomInt`) cached in Redis with SHA-256 hashes, 5-minute TTL, 60-second cooldown, and 5-attempt brute-force lockout.
- [x] Implemented dual-token session architecture: short-lived access JWT (15 minutes) and rotating opaque 80-char hex refresh token (7 days) stored in secure `HttpOnly`, `SameSite=lax` cookie.
- [x] Implemented RFC 6749 Token Rotation with automatic token family reuse detection (revokes all active sessions in the token family upon detecting compromised token replay).
- [x] Implemented forgot password and reset password workflows with single-use 64-char crypto tokens and session invalidation.
- [x] Implemented RBAC and Permission-based authorization guards (`RolesGuard`, `PermissionsGuard`) with `SUPER_ADMIN` platform override.
- [x] Implemented global `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard` as `APP_GUARD` with `@Public()` decorator bypass.
- [x] Created unit tests (43 passing across 8 suites) and E2E integration tests (24 passing across 2 suites).

### Deliverables

- `apps/api/src/modules/auth/` (AuthModule, AuthService, AuthController, DTOs, Guards, Strategies, Decorators, Interfaces).
- `apps/api/src/modules/email/` (EmailModule, EmailService, responsive HTML/text email templates).
- `apps/api/prisma/migrations/20261119081743_session_token_family/` (Session token family schema migration).
- `apps/api/src/modules/auth/auth.service.spec.ts` (Comprehensive unit test coverage).
- `apps/api/test/auth.e2e-spec.ts` (Comprehensive end-to-end authentication and token reuse test suite).

### Completion Criteria

All authentication endpoints (`/register`, `/verify-email`, `/resend-verification-otp`, `/login`, `/refresh`, `/logout`, `/logout-all`, `/forgot-password`, `/reset-password`, `/me`) are fully operational, tested against live PostgreSQL and Redis services, and documented in Swagger. Mobile/SMS verification was intentionally kept out of scope as required.

---

# 7. Phase 05 — Frontend Foundation & Design System

**Priority:** High  
**Status:** Not Started

### Objective

Create the Next.js application foundation and reusable UI system.

### Tasks

- [ ] Configure Next.js App Router.
- [ ] Establish frontend directory structure.
- [ ] Configure global styles.
- [ ] Establish typography and design tokens.
- [ ] Build reusable buttons.
- [ ] Build form components.
- [ ] Build input components.
- [ ] Build modal and dialog components.
- [ ] Build dropdown and menu components.
- [ ] Build cards and layout components.
- [ ] Build loading and empty states.
- [ ] Build error states.
- [ ] Configure API client.
- [ ] Configure frontend environment variables.
- [ ] Create responsive layouts.
- [ ] Establish accessibility standards.

### Deliverables

- Working frontend foundation.
- Reusable component system.
- Responsive layout foundation.
- API integration layer.

### Completion Criteria

The frontend must have a consistent reusable design system and be ready for feature development.

---

# 8. Phase 06 — User & Profile Management

**Priority:** High  
**Status:** Not Started

### Objective

Implement customer accounts and profile management.

### Tasks

- [ ] Build customer profile APIs.
- [ ] Build profile update functionality.
- [ ] Implement address management.
- [ ] Implement account settings.
- [ ] Implement account status handling.
- [ ] Build customer profile screens.
- [ ] Build address management screens.
- [ ] Integrate frontend with backend.
- [ ] Test customer data isolation.

### Deliverables

- Customer profile management.
- Address management.
- Account settings.

### Completion Criteria

Customers must be able to manage their own profiles and addresses securely.

---

# 9. Phase 07 — Seller Onboarding & Management

**Priority:** High  
**Status:** Not Started

### Objective

Implement seller registration, verification, and account management.

### Tasks

- [ ] Build seller registration.
- [ ] Implement seller profile.
- [ ] Implement store information.
- [ ] Implement business details.
- [ ] Implement document submission if required.
- [ ] Implement verification workflow.
- [ ] Implement admin approval.
- [ ] Implement seller activation and suspension.
- [ ] Build seller onboarding screens.
- [ ] Build seller profile screens.
- [ ] Test seller permissions.

### Deliverables

- Seller onboarding workflow.
- Seller profiles.
- Seller approval system.
- Seller management APIs.

### Completion Criteria

The approved seller onboarding workflow must operate correctly with appropriate administrative controls.

---

# 10. Phase 08 — Product Catalog & Categories

**Priority:** High  
**Status:** Not Started

### Objective

Build the platform product catalog and category management system.

### Tasks

- [ ] Implement category management.
- [ ] Implement product creation.
- [ ] Implement product updates.
- [ ] Implement product descriptions.
- [ ] Implement product images.
- [ ] Implement product attributes.
- [ ] Implement product variants if required.
- [ ] Implement product status management.
- [ ] Implement product search.
- [ ] Implement product filtering.
- [ ] Implement product sorting.
- [ ] Build category pages.
- [ ] Build product detail pages.
- [ ] Build admin catalog management.

### Deliverables

- Product catalog APIs.
- Category management.
- Product discovery interfaces.
- Product detail interfaces.

### Completion Criteria

Approved product catalog workflows must support creation, management, discovery, and retrieval.

---

# 11. Phase 09 — Seller Listings & Inventory

**Priority:** High  
**Status:** Not Started

### Objective

Implement seller-specific product listings, pricing, and stock management.

### Tasks

- [ ] Implement seller product listings.
- [ ] Associate listings with catalog products.
- [ ] Implement seller-specific pricing.
- [ ] Implement listing availability.
- [ ] Implement stock management.
- [ ] Implement inventory adjustment history.
- [ ] Implement stock validation.
- [ ] Implement stock reservation logic.
- [ ] Implement concurrency protection.
- [ ] Build seller inventory screens.
- [ ] Test inventory consistency.

### Deliverables

- Seller listing management.
- Inventory APIs.
- Stock management interfaces.
- Inventory validation and reservation logic.

### Completion Criteria

Inventory operations must prevent overselling and maintain consistency during concurrent purchase attempts.

---

# 12. Phase 10 — Customer Shopping Experience

**Priority:** High  
**Status:** Not Started

### Objective

Build the customer-facing marketplace browsing experience.

### Tasks

- [ ] Build homepage.
- [ ] Build category navigation.
- [ ] Build product listing pages.
- [ ] Build product detail pages.
- [ ] Build search interface.
- [ ] Implement filters.
- [ ] Implement sorting.
- [ ] Display seller availability.
- [ ] Display pricing and stock information.
- [ ] Build responsive layouts.
- [ ] Integrate product APIs.

### Deliverables

- Customer marketplace interface.
- Product discovery.
- Search and filtering.
- Product detail experience.

### Completion Criteria

Customers must be able to discover products and view valid seller-specific offerings.

---

# 13. Phase 11 — Cart & Checkout

**Priority:** Critical  
**Status:** Not Started

### Objective

Implement single-store cart management, store-switch confirmation, and checkout preparation.

### Tasks

- [ ] Implement single-store cart binding (cart bound to `sellerId`).
- [ ] Implement store-switch confirmation modal when adding from a different store (clearing existing cart).
- [ ] Implement add-to-cart, remove-from-cart, and quantity update APIs.
- [ ] Validate store operational hours and open status.
- [ ] Validate seller listing availability and price <= MRP.
- [ ] Validate minimum order value (MOV).
- [ ] Calculate distance-tiered delivery fee based on store radius.
- [ ] Validate and apply platform coupons.
- [ ] Implement atomic 15-minute inventory reservation (`StockReservation`).
- [ ] Handle BullMQ auto-release for abandoned or expired checkout sessions.
- [ ] Build cart and checkout summary interfaces.

### Deliverables

- Cart APIs and single-store enforcement.
- Store-switch UX modal.
- Checkout summary with validated price breakdowns.
- Atomic inventory reservation engine with TTL.

### Completion Criteria

The backend must strictly enforce single-store cart limits and atomic inventory reservations without trusting client-provided prices or quantities.

---

# 14. Phase 12 — Order Management

**Priority:** Critical  
**Status:** Not Started

### Objective

Implement single-store order creation and end-to-end lifecycle management.

### Tasks

- [ ] Implement single-store order creation (direct mapping to `sellerId`).
- [ ] Implement immutable `OrderItem` snapshots (product title, variant, SKU, price, MRP).
- [ ] Implement immutable delivery address snapshot.
- [ ] Implement order lifecycle state transitions (`PENDING -> CONFIRMED -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED`).
- [ ] Implement store order acceptance and packing workflow.
- [ ] Implement lifecycle cancellation rules (free pre-pack, restricted post-pack, locked in transit).
- [ ] Implement customer complaint workflows for perishables (3-4h) and packaged goods (24-48h).
- [ ] Implement immutable `OrderStatusHistory` audit logs.
- [ ] Build customer order details and tracking screens.
- [ ] Build seller order packing screens.

### Deliverables

- Single-store order management APIs.
- Order lifecycle state engine.
- Customer order history & milestone tracking UI.
- Seller fulfillment & packing interface.

### Completion Criteria

Order creation and status transitions must strictly follow approved single-store business rules and maintain immutable database snapshots.

---

# 15. Phase 13 — Payment Integration

**Priority:** Critical  
**Status:** Not Started

### Objective

Integrate the approved payment provider and implement reliable payment processing.

### Tasks

- [ ] Configure payment provider.
- [ ] Implement payment initiation.
- [ ] Implement payment verification.
- [ ] Implement webhook handling.
- [ ] Verify webhook signatures.
- [ ] Implement idempotency.
- [ ] Store payment transactions.
- [ ] Implement payment status transitions.
- [ ] Implement payment failure handling.
- [ ] Implement payment retries where appropriate.
- [ ] Implement refund workflows.
- [ ] Implement COD handling if approved.
- [ ] Test duplicate and delayed webhook events.

### Deliverables

- Payment integration.
- Transaction records.
- Payment verification.
- Refund handling.
- Payment reconciliation foundation.

### Completion Criteria

Payment records must accurately reflect verified provider events, and repeated callbacks must not create duplicate financial operations.

---

# 16. Phase 14 — Delivery & Fulfillment

**Priority:** High  
**Status:** Not Started

### Objective

Implement the approved delivery and order fulfillment model.

### Tasks

- [ ] Implement fulfillment status management.
- [ ] Implement shipment creation if applicable.
- [ ] Implement delivery assignment if applicable.
- [ ] Implement delivery tracking.
- [ ] Implement shipment status updates.
- [ ] Implement delivery completion.
- [ ] Implement failed delivery handling.
- [ ] Implement delivery cancellation.
- [ ] Implement delivery notifications.
- [ ] Build customer tracking interface.
- [ ] Build seller fulfillment interface.
- [ ] Test delivery lifecycle.

### Deliverables

- Delivery management APIs.
- Fulfillment workflows.
- Order tracking.
- Delivery interfaces.

### Completion Criteria

Customers and authorized sellers must be able to view accurate delivery and fulfillment status.

---

# 17. Phase 15 — Coupons, Discounts & Promotions

**Priority:** Medium  
**Status:** Not Started

### Objective

Implement the approved promotional and discount system.

### Tasks

- [ ] Implement coupon creation.
- [ ] Implement coupon validation.
- [ ] Implement coupon expiration.
- [ ] Implement minimum order requirements.
- [ ] Implement usage limits.
- [ ] Implement customer eligibility.
- [ ] Implement seller-specific coupons if approved.
- [ ] Implement platform-wide promotions.
- [ ] Implement discount calculations.
- [ ] Build admin promotion management.
- [ ] Test coupon stacking and eligibility rules.

### Deliverables

- Coupon management.
- Discount calculation engine.
- Promotional interfaces.

### Completion Criteria

Discounts must be validated and calculated on the backend according to approved rules.

---

# 18. Phase 16 — Reviews & Ratings

**Priority:** Medium  
**Status:** Not Started

### Objective

Allow customers to submit reviews and ratings for eligible purchases.

### Tasks

- [ ] Implement review creation.
- [ ] Implement rating validation.
- [ ] Restrict reviews to eligible customers.
- [ ] Implement review editing rules.
- [ ] Implement review moderation.
- [ ] Implement review reporting.
- [ ] Display product ratings.
- [ ] Build review interfaces.
- [ ] Test duplicate review restrictions.

### Deliverables

- Review APIs.
- Rating calculations.
- Review display and moderation.

### Completion Criteria

Only authorized customers must be able to submit reviews according to the approved review policy.

---

# 19. Phase 17 — Notifications

**Priority:** Medium  
**Status:** Not Started

### Objective

Build the notification system for important customer, seller, and administrative events.

### Tasks

- [ ] Define notification events.
- [ ] Implement in-app notifications.
- [ ] Implement email notifications if selected.
- [ ] Implement SMS notifications if selected.
- [ ] Implement push notifications if selected.
- [ ] Implement notification preferences.
- [ ] Implement delivery status tracking.
- [ ] Implement retry handling.
- [ ] Build notification interfaces.
- [ ] Test notification delivery.

### Deliverables

- Notification service.
- Notification event handling.
- Notification preferences.
- Delivery tracking.

### Completion Criteria

Important events must trigger the appropriate notifications without blocking critical order or payment operations.

---

# 20. Phase 18 — Seller Dashboard

**Priority:** High  
**Status:** Not Started

### Objective

Provide sellers with a centralized interface for managing their marketplace operations.

### Features

- Seller overview.
- Store profile.
- Product management.
- Listing management.
- Inventory management.
- Order management.
- Fulfillment management.
- Sales analytics.
- Earnings overview.
- Settlement history.
- Account settings.

### Tasks

- [ ] Build seller dashboard layout.
- [ ] Implement seller overview APIs.
- [ ] Implement product management screens.
- [ ] Implement inventory screens.
- [ ] Implement order management screens.
- [ ] Implement sales reports.
- [ ] Implement earnings views.
- [ ] Implement account settings.
- [ ] Enforce seller-level data isolation.

### Deliverables

A functional seller dashboard.

### Completion Criteria

Sellers must be able to manage only their own authorized marketplace resources.

---

# 21. Phase 19 — Admin Dashboard

**Priority:** High  
**Status:** Not Started

### Objective

Provide administrators with centralized marketplace management.

### Features

- Platform overview.
- Customer management.
- Seller management.
- Seller approval.
- Product moderation.
- Category management.
- Order monitoring.
- Payment monitoring.
- Refund management.
- Coupon management.
- Review moderation.
- Reports and analytics.
- Audit logs.
- Platform configuration.

### Tasks

- [ ] Build admin dashboard layout.
- [ ] Implement admin overview APIs.
- [ ] Implement customer management.
- [ ] Implement seller management.
- [ ] Implement product moderation.
- [ ] Implement order monitoring.
- [ ] Implement payment and refund views.
- [ ] Implement promotional management.
- [ ] Implement reports.
- [ ] Implement audit log views.
- [ ] Enforce administrative permissions.

### Deliverables

A functional administrative dashboard.

### Completion Criteria

Administrators must be able to manage authorized platform operations with traceable administrative actions.

---

# 22. Phase 20 — Financial Management & Settlements

**Priority:** High  
**Status:** Not Started

### Objective

Implement financial tracking for seller earnings, platform commissions, refunds, and payouts.

### Tasks

- [ ] Implement commission calculations.
- [ ] Implement seller earning records.
- [ ] Implement refund adjustments.
- [ ] Implement settlement calculation.
- [ ] Implement payout records.
- [ ] Implement settlement approval if required.
- [ ] Implement settlement history.
- [ ] Implement reconciliation reports.
- [ ] Implement financial audit history.
- [ ] Test rounding and monetary calculations.

### Deliverables

- Financial management APIs.
- Commission tracking.
- Seller earnings.
- Settlement and payout records.
- Financial reports.

### Completion Criteria

Every financial movement must be traceable and reconcilable with the corresponding order, payment, refund, or settlement.

---

# 23. Phase 21 — Testing & Security Hardening

**Priority:** Critical  
**Status:** Not Started

### Objective

Validate the complete system before production deployment.

### Backend Testing

- [ ] Unit tests.
- [ ] Service tests.
- [ ] API integration tests.
- [ ] Database integration tests.
- [ ] Authorization tests.
- [ ] Transaction tests.
- [ ] Payment webhook tests.
- [ ] Inventory concurrency tests.

### Frontend Testing

- [ ] Component tests.
- [ ] Form validation tests.
- [ ] API integration tests.
- [ ] Responsive layout testing.
- [ ] Accessibility testing.
- [ ] Error-state testing.

### End-to-End Testing

- [ ] Customer registration.
- [ ] Customer login.
- [ ] Seller onboarding.
- [ ] Seller product listing.
- [ ] Product discovery.
- [ ] Cart operations.
- [ ] Checkout.
- [ ] Payment.
- [ ] Order creation.
- [ ] Order fulfillment.
- [ ] Delivery tracking.
- [ ] Cancellation and refund.
- [ ] Seller settlement.
- [ ] Admin management.

### Security Checklist

- [ ] Validate all incoming data.
- [ ] Enforce authorization on backend routes.
- [ ] Protect sensitive account information.
- [ ] Secure authentication sessions.
- [ ] Verify payment webhooks.
- [ ] Apply rate limiting where appropriate.
- [ ] Protect against common web vulnerabilities.
- [ ] Review CORS and security headers.
- [ ] Protect secrets and environment variables.
- [ ] Review database access permissions.
- [ ] Review file upload validation if uploads are supported.
- [ ] Review logs for sensitive data exposure.

### Deliverables

- Automated test coverage for critical workflows.
- Security review.
- Regression test results.
- Release readiness report.

### Completion Criteria

Critical workflows must pass their tests, and no unresolved critical security issue may remain at release approval.

---

# 24. Phase 22 — Deployment & Production Launch

**Priority:** Critical  
**Status:** Not Started

### Objective

Deploy Marvel's Basket to production.

### Tasks

- [ ] Select hosting providers.
- [ ] Configure production frontend.
- [ ] Configure production backend.
- [ ] Configure production PostgreSQL.
- [ ] Configure production environment variables.
- [ ] Configure domain and DNS.
- [ ] Configure HTTPS.
- [ ] Configure CI/CD.
- [ ] Configure database migrations.
- [ ] Configure database backups.
- [ ] Configure application logging.
- [ ] Configure error monitoring.
- [ ] Configure health checks.
- [ ] Configure production security settings.
- [ ] Perform production smoke tests.
- [ ] Verify payment provider production configuration.
- [ ] Verify email and notification delivery.
- [ ] Prepare rollback procedures.
- [ ] Approve production launch.

### Deliverables

- Production frontend.
- Production backend.
- Production database.
- CI/CD pipeline.
- Monitoring and backup setup.
- Launch readiness checklist.

### Completion Criteria

All production services must be operational, secure, monitored, and verified through production smoke tests.

---

# 25. Phase 23 — Post-Launch Monitoring & Optimization

**Priority:** High  
**Status:** Not Started

### Objective

Monitor the live platform and improve performance, reliability, and user experience.

### Tasks

- [ ] Monitor application errors.
- [ ] Monitor API performance.
- [ ] Monitor database performance.
- [ ] Monitor payment failures.
- [ ] Monitor order failures.
- [ ] Monitor inventory consistency.
- [ ] Monitor notification delivery.
- [ ] Review customer feedback.
- [ ] Review seller feedback.
- [ ] Optimize slow queries.
- [ ] Optimize frontend performance.
- [ ] Improve caching where appropriate.
- [ ] Review infrastructure costs.
- [ ] Address production bugs.
- [ ] Plan subsequent releases.

### Deliverables

- Monitoring reports.
- Performance improvements.
- Bug fixes.
- Post-launch improvement roadmap.

### Completion Criteria

The platform must have an ongoing process for identifying, prioritizing, and resolving production issues.

---

# 26. Cross-Phase Development Standards

These standards apply to every implementation phase.

## 26.1 Code Quality

- Use TypeScript consistently.
- Follow established project conventions.
- Avoid unnecessary code duplication.
- Keep modules focused on their responsibilities.
- Prefer reusable components and services.
- Remove unused code and dependencies.

## 26.2 Database Standards

- Use Prisma migrations.
- Maintain referential integrity.
- Add indexes based on query requirements.
- Use transactions for critical operations.
- Avoid storing derived values without a clear reason.
- Preserve financial and order history appropriately.

## 26.3 API Standards

- Validate all incoming requests.
- Use DTOs for request validation.
- Apply authorization to protected endpoints.
- Use consistent response formats.
- Document endpoints.
- Handle errors centrally.

## 26.4 Frontend Standards

- Build reusable components.
- Maintain responsive layouts.
- Handle loading and error states.
- Keep sensitive business logic on the backend.
- Follow accessibility practices.
- Avoid exposing secrets in client-side code.

## 26.5 Testing Standards

- Write tests alongside features.
- Test both successful and failure scenarios.
- Test authorization boundaries.
- Test concurrent operations where relevant.
- Test financial and inventory edge cases.
- Run regression tests before merging major changes.

## 26.6 Git and Version Control

- Use meaningful branch names.
- Write descriptive commit messages.
- Keep changes focused.
- Review changes before merging.
- Do not commit secrets or local environment files.
- Keep the main branch stable.

---

# 27. Phase Completion and Approval Process

A phase can only be marked completed after the following conditions are met:

1. All required tasks are implemented.
2. Relevant automated tests pass.
3. Manual verification is completed where required.
4. Security implications are reviewed.
5. Documentation is updated.
6. No unresolved critical blocker remains.
7. The phase deliverables are verified.

### Recommended Phase Status Values

| Status | Meaning |
|---|---|
| Not Started | Work has not begun |
| In Progress | Implementation is underway |
| Blocked | Work depends on an unresolved issue |
| In Review | Implementation is awaiting review |
| Testing | Verification is underway |
| Completed | All completion criteria are satisfied |
| Deferred | Work has intentionally been postponed |

---

# 28. Overall Project Milestones

| Milestone | Expected Outcome |
|---|---|
| M1 | Business rules and technical decisions approved |
| M2 | Monorepo and development environment ready |
| M3 | Backend foundation and database ready |
| M4 | Authentication and authorization ready |
| M5 | Frontend foundation and customer profiles ready |
| M6 | Seller onboarding and product catalog ready |
| M7 | Listings, inventory, and shopping experience ready |
| M8 | Cart, checkout, and order management ready |
| M9 | Payments and delivery workflows ready |
| M10 | Seller and admin dashboards ready |
| M11 | Financial workflows and supporting features ready |
| M12 | Testing and security hardening completed |
| M13 | Production deployment completed |
| M14 | Post-launch monitoring active |

No fixed calendar estimates are assigned at this stage. Estimates should be added after scope confirmation and task breakdown.

---

# 29. Current Implementation Status

**Current Stage:** Planning & Documentation

**Documentation Prepared:**

- `PROJECT_CONTEXT.md`
- `PROJECT_REQUIREMENTS.md`
- `TECHNICAL_ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `PROJECT_STATUS.md`
- `PROJECT_DECISIONS.md`
- `IMPLEMENTATION_PHASES.md`

**Implementation Status:** Not Started

**Immediate Next Steps:**

1. Review and approve the seven foundational documents.
2. Resolve business-critical pending decisions in `PROJECT_DECISIONS.md`.
3. Finalize the database schema based on approved business rules.
4. Initialize the monorepo.
5. Begin Phase 01.
6. Update `PROJECT_STATUS.md` as verified work progresses.

---

# 30. Roadmap Maintenance

This roadmap must be updated whenever:

- A phase is started or completed.
- New requirements are introduced.
- A technical decision changes.
- A dependency causes a phase to be reordered.
- Features are added, removed, or deferred.
- Testing reveals additional implementation work.
- Production requirements change.

The roadmap should always represent the actual approved implementation plan rather than an outdated estimate.

---

**Document End — IMPLEMENTATION_PHASES.md**