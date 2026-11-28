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
**Status:** Completed (Verified on 19 November 2026)

### Objective

Establish a scalable, responsive, accessible, and production-ready Next.js 15 App Router frontend foundation and design system for Marvel's Basket (`apps/web`), faithfully reproducing the official brand identity and UI reference design.

### Tasks

- [x] Configure Next.js App Router with TypeScript and strict type checking.
- [x] Establish scalable frontend directory architecture (`src/app/`, `components/ui/`, `components/feedback/`, `components/layout/`, `components/shared/`, `lib/api/`, `styles/`).
- [x] Integrate official brand logo assets (`logo.png`, `logo-light.png`, `logo-dark.jpg`) in public directories and create responsive `Logo` component.
- [x] Centralize design tokens in `src/styles/tokens.ts` and integrate with `tailwind.config.ts` (Forest Green `#0B5D2A`, Brand Green `#15803D`, Citrus Yellow CTA `#F4E022`, Lime Highlight `#D4E137`, Category Surface `#F4F6F8`, custom radii).
- [x] Configure global styles and accessibility baseline in `src/app/globals.css` (focus rings, reduced motion, custom scrollbar).
- [x] Build CVA reusable button primitives (`primary`/`cta`, `brand`, `secondary`, `outline`, `ghost`, `destructive`, `link`, with sizes, pill variants, and loading spinner).
- [x] Build form components with accessible labels and error handling (`Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`).
- [x] Build surface primitives (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Badge`).
- [x] Build accessible overlay components (`Dialog` with backdrop blur and focus trapping, `DropdownMenu` with keyboard and outside-click dismiss).
- [x] Build feedback components (`Spinner`, `Skeleton`, `StoreCardSkeleton`, `CategoryTileSkeleton`, `EmptyState`, `ErrorState`).
- [x] Build layout components (`StorefrontLayout`, `Header`, `Footer`).
- [x] Faithfully reproduce the dual-tier header from the reference design (Tier 1: logo, Azamgarh location selector modal, 9999px pill search bar, login, cart; Tier 2: Category trigger, promotional links, mobile drawer).
- [x] Build homepage showcase components (`HeroBanner` with wave accent and 3 trust badges, `CategoryRail` with 8 categories on `#F4F6F8` tiles, `FeaturedSellers` with rating stars and delivery times).
- [x] Implement typed `ApiClient` with timeout abort, query parameter serialization, JSON error normalization, and `credentials: 'include'` for cookie transport.
- [x] Build error, loading, and not-found route handlers (`error.tsx`, `loading.tsx`, `not-found.tsx`).
- [x] Validate frontend builds, type checks, lint checks, and unit tests (all passing cleanly).

### Deliverables

- `apps/web/src/styles/tokens.ts` (Centralized design tokens).
- `apps/web/tailwind.config.ts` (Tailwind theme extension).
- `apps/web/src/app/globals.css` (Global styles and focus states).
- `apps/web/src/components/ui/` (Button, Input, Textarea, Select, Checkbox, Radio, Switch, Badge, Card, Dialog, DropdownMenu).
- `apps/web/src/components/feedback/` (Spinner, Skeleton, EmptyState, ErrorState).
- `apps/web/src/components/layout/` (Header, Footer, StorefrontLayout).
- `apps/web/src/components/shared/` (Logo, HeroBanner, CategoryRail, FeaturedSellers).
- `apps/web/src/lib/api/` (ApiClient, ApiError, endpoints, types).
- `apps/web/src/app/` (Root layout, Home page showcase, error, loading, not-found boundaries).
- `apps/web/public/images/` (Official logo and brand assets).
- `apps/web/src/lib/api/client.spec.ts` & `apps/web/src/lib/utils/cn.spec.ts` (Unit tests for API client and design tokens).

### Completion Criteria

The Next.js frontend builds without errors (`npm run build:web`), passes strict type checking, format checking, and linting (`npm run check`), satisfies WCAG 2.2 AA accessibility requirements, faithfully reproduces the provided brand identity and UI reference image, and provides an extensible foundation for subsequent feature phases.

---

# 8. Phase 06 — User & Profile Management

**Priority:** High  
**Status:** **Completed** (Verified on 19 November 2026)

### Objective

Implement customer accounts and profile management across backend APIs and mobile-first responsive frontend.

### Tasks

- [x] Build customer profile APIs (`GET /api/v1/users/me`, `PATCH /api/v1/users/me`, `GET /api/v1/users/me/account`, `GET/PATCH /api/v1/users/me/preferences`, `PATCH /api/v1/users/me/deactivate`).
- [x] Build profile update functionality (name, avatar URL, date of birth; strict protection against role/email modification).
- [x] Implement address management CRUD (`/api/v1/addresses` list, create, detail, update, delete, set default).
- [x] Implement atomic single default address invariant and promotion upon deletion in PostgreSQL transactions.
- [x] Implement account settings and channel preferences (email, SMS, push, promotional notifications).
- [x] Implement account status handling and soft deactivation with active session revocation.
- [x] Build mobile-first customer profile screens (`/profile`, `/profile/edit`, `/account`).
- [x] Build mobile-first address management screens (`/addresses` list, add/edit modal, delete confirmation dialog).
- [x] Implement persistent mobile bottom navigation bar (`md:hidden`) with 5 tabs.
- [x] Standardize customer-facing Basket terminology throughout UI, navigation, and empty states.
- [x] Integrate frontend with actual backend APIs via typed `ApiClient`.
- [x] Test customer data isolation and IDOR prevention with dedicated E2E test suite (13 passing tests).

### Deliverables

- `apps/api/src/modules/users/` (Profile, account overview, preferences, and deactivation).
- `apps/api/src/modules/addresses/` (Complete delivery address CRUD with default management).
- `apps/api/test/customer-isolation.e2e-spec.ts` (13 E2E security & data-isolation tests).
- `apps/web/src/features/profile/` & `apps/web/src/features/addresses/` (Frontend services and components).
- `apps/web/src/app/(customer)/` (`layout.tsx`, `profile/page.tsx`, `profile/edit/page.tsx`, `addresses/page.tsx`, `account/page.tsx`).
- `apps/web/src/app/basket/page.tsx` & `apps/web/src/components/layout/mobile-bottom-nav.tsx`.

### Completion Criteria

Customers are able to view and manage their own profiles, delivery addresses, and communication preferences securely with complete mobile-first responsiveness, strict data isolation, zero IDOR vulnerabilities, and 100% test passage.

---

# 9. Phase 07 — Seller Onboarding & Management

**Priority:** High  
**Status:** Completed  
**Completed Date:** 20 November 2026

### Objective

Implement complete seller registration, business onboarding, KYC document management, admin verification, and store activation workflows.

### Tasks

- [x] Build public seller discovery entry point in storefront footer (`PARTNER -> Sell on Marvel's Basket`).
- [x] Build conversion-focused landing page (`/sell-on-marvels-basket`) with value props, requirements, FAQ, and dynamic CTAs.
- [x] Implement 5-step seller onboarding form wizard (`/seller/onboarding`) with client and server validation.
- [x] Implement real-time draft saving and seamless step resumption without data loss.
- [x] Implement Step 1: Personal profile & merchant contact details with verified email validation.
- [x] Implement Step 2: Store information, category selection, physical address, geolocation capture, service radius, and operating hours.
- [x] Implement Step 3: Business & tax details with PAN, GSTIN, and conditional mandatory FSSAI for food/grocery categories.
- [x] Implement Step 4: Bank & settlement details with AES-256-GCM encryption at rest, masked representation, and IFSC validation.
- [x] Implement Step 5: Document uploads with Cloudinary authenticated private storage (PDF, JPEG, PNG, WebP) and final review.
- [x] Implement seller application status tracking page (`/seller/application`) with state-driven feedback banners.
- [x] Implement admin seller application queue (`/admin/sellers`) with search, status filtering, category filtering, and pagination.
- [x] Implement admin inspection console (`/admin/sellers/:id`) with in-app PDF and image document preview.
- [x] Implement document review workflow (VERIFIED, REJECTED with feedback notes).
- [x] Implement 5-state lifecycle state machine (`DRAFT` ➔ `PENDING_VERIFICATION` ➔ `APPROVED_ACTIVE` | `REJECTED` | `SUSPENDED`).
- [x] Implement atomic store activation and `SELLER` role assignment on approval.
- [x] Implement rejection with feedback notes and merchant re-drafting capability.
- [x] Implement store suspension and reactivation controls with full audit history (`seller_status_history`).
- [x] Implement operational seller profile (`/seller/profile`) and store settings (`/seller/store`) management.
- [x] Integrate Resend transactional email notifications for submission, approval, rejection, suspension, and reactivation.
- [x] Add comprehensive test coverage: 18 unit tests, 22 live database E2E tests, 7 web service unit tests.

### Deliverables

- `apps/api/src/modules/sellers/`: SellersModule, SellersController, AdminSellersController, SellersService, AdminSellersService, DTOs.
- `apps/api/src/modules/cloudinary/`: CloudinaryModule, CloudinaryService with authenticated private upload & signed preview generation.
- `apps/api/src/common/utils/encryption.util.ts`: AES-256-GCM bank details encryption & masking utility.
- `apps/api/src/modules/email/templates/seller-lifecycle.template.ts`: Branded transactional email templates.
- `apps/web/src/features/seller/`: Multi-step form components, document upload with in-app preview, seller and admin API client services.
- `apps/web/src/app/`: `/sell-on-marvels-basket`, `/seller/onboarding`, `/seller/application`, `/seller/profile`, `/seller/store`, `/admin/sellers`, `/admin/sellers/[id]`.
- Prisma Migration: `20261120024133_seller_onboarding_and_kyc`.
- Complete test suites: 95 unit tests in API, 42 unit tests in Web, 59 E2E tests passing.

### Completion Criteria

Merchants can discover seller registration, save incomplete applications as drafts, submit complete profiles with KYC documents, inspect status, manage operational parameters, while administrators can review applications, inspect documents inside the application, approve stores with automatic role assignment, reject with correction guidance, and suspend/reactivate stores with complete audit logging.

---

# 10. Phase 08 — Product Catalog & Categories

**Priority:** High  
**Status:** Completed  
**Completed Date:** 20 November 2026

### Objective

Build the platform master product catalog and category management system under the Aggregator / Hybrid Marketplace Model. Marvel's Basket owns the centralized product definitions, categories, brands, variants, imagery, and MRP ceilings, while store inventory and pricing are decoupled and resolved based on customer serviceability.

### Tasks

- [x] Implement category management (2-tier taxonomy: L1 Department, L2 Subcategory, icon and banner image uploads via Cloudinary, display ordering).
- [x] Implement brand registry management (verified brand list, logos, slugs, active toggles).
- [x] Implement master product creation with multi-step wizard (`/admin/products/new`).
- [x] Implement master product updates, dossier inspection, and store inventory partner mapping view (`/admin/products/[id]`).
- [x] Implement product descriptions, legal metrology (country of origin, manufacturer/packer details, shelf life, storage instructions).
- [x] Implement Cloudinary product imagery with max-5 images per variant constraint.
- [x] Implement product attributes and JSON specifications.
- [x] Implement product variants with pack sizes, units, barcode/EAN-13, and legally binding MRP ceiling.
- [x] Implement product status lifecycle management (`DRAFT`, `ACTIVE`, `INACTIVE`, `DISCONTINUED`, `ARCHIVED`).
- [x] Implement customer product search with Indian grocery colloquial synonyms (`searchTags`) and autocomplete suggestions.
- [x] Implement store-scoped customer catalog discovery with dynamic store selling prices and real-time stock availability.
- [x] Implement product filtering (category, subcategory, brand, food preference, price range, in-stock).
- [x] Implement product sorting (`price_asc`, `price_desc`, `name_asc`, `popular`, `newest`).
- [x] Build responsive category department grid (`/categories`) and subcategory rail page (`/categories/[slug]`) following Zepto/BigBasket ergonomics.
- [x] Build rich Product Detail Page (`/products/[slug]`) with image gallery, pack size selector, dietary badges, and tabs.
- [x] Build admin catalog management tables, filters, and status modal (`/admin/products`, `/admin/categories`).
- [x] Automated unit and E2E testing for Categories, Brands, Products, and AdminProducts services.

### Deliverables

- Backend Modules: `CategoriesModule`, `BrandsModule`, `ProductsModule`, `AdminProductsModule`.
- Database Models & Migration: `Category`, `Brand`, `Product`, `ProductVariant`, `ProductImage`, `ProductAttributeDefinition` in migration `20261120052417_product_catalog_and_categories`.
- Customer Storefront: Responsive Category Rail, Department Explorer, Quick-Commerce Product Card with ADD counter, 2-column Product Detail Page.
- Admin Dashboard: Category hierarchy tree view, Master Product table, 9-section master product wizard, dossier manager.
- Quality Gates: 151 API unit tests passing, 75 API E2E tests passing, 8 Web unit tests passing, 0 TypeScript errors, clean production Next.js build.

### Completion Criteria

Approved platform master catalog workflows support creation, editing, variant management, publication state transitions, store inventory inspection, and store-scoped customer discovery.

---

# 11. Phase 09 — Seller Listings & Inventory

**Priority:** High  
**Status:** **Completed**

### Objective

Implement seller-specific product listings, pricing, and stock management.

### Tasks

- [x] Implement seller product listings (`SellerProduct` mapped to master catalog variants).
- [x] Associate listings with catalog products with strict `(seller_id, variant_id)` partial uniqueness.
- [x] Implement seller-specific pricing with database CHECK constraint (`0 < selling_price <= variant.mrp`).
- [x] Implement listing availability and statuses (`ACTIVE`, `PAUSED`, `OUT_OF_STOCK`, `DISABLED`).
- [x] Implement triple-state inventory management (`stock_on_hand`, `reserved_stock`, `available_stock = stock_on_hand - reserved_stock`).
- [x] Implement append-only immutable inventory adjustment history ledger (`InventoryTransaction`) with before/after balance tracking.
- [x] Implement stock validation and mathematical ledger reconciliation.
- [x] Implement stock reservation logic with 10-minute configurable TTL and background Redis distributed lock expiration worker.
- [x] Implement concurrency protection: parameterized conditional SQL update (zero overselling) and consistent ascending row-lock ordering (zero deadlocks).
- [x] Build responsive seller inventory dashboard UI with overview metrics, catalog browser, quick price edit, stock adjustment modal, audit drawer, and reconciliation modal.
- [x] Test inventory consistency (175 API unit tests, 8 real PostgreSQL E2E concurrency tests, 62 Web tests).

### Deliverables

- Seller listing management APIs (`/api/v1/seller/stores/:storeId/listings/*`).
- Master catalog browser API for sellers (`/api/v1/seller/catalog/products`).
- Inventory management & audit ledger APIs (`/api/v1/seller/stores/:storeId/inventory/*`).
- Cart pre-checkout revalidation and reservation APIs (`/api/v1/inventory/*`).
- Automated background reservation expiration worker with distributed Redis locking.
- Seller Inventory Frontend Dashboard (`/seller/inventory`) with overview cards, search/filters, action modals, and ledger history.
- Concurrency & Invariant test suite (`inventory-concurrency.e2e-spec.ts`).

### Completion Criteria

Inventory operations must prevent overselling and maintain consistency during concurrent purchase attempts. (Verified with 8/8 real PostgreSQL E2E tests).

---

# 12. Phase 10 — Customer Shopping Experience

**Priority:** High  
**Status:** Completed (Verified on 25 November 2026)

### Objective

Build the location-aware customer marketplace browsing experience connecting real backend catalog, seller listings, inventory, pricing, location resolution, and persistent single-store basket.

### Tasks

- [x] Build homepage (10-section storefront removing temporary component showcase).
- [x] Build category navigation (`/categories` and `/categories/[slug]` split-pane & sidebar).
- [x] Build product listing pages (`/stores`, `/stores/[slug]`, `/categories/[slug]`).
- [x] Build product detail pages (`/products/[slug]` with live price/stock revalidation & variant selection).
- [x] Build search interface (`/search` + instant 250ms autocomplete with Hinglish synonyms & typo tolerance).
- [x] Implement filters (category, brand, dietary, discount, in-stock, URL sync).
- [x] Implement sorting (relevance, store sellingPrice low/high, discount, popular, newest).
- [x] Display seller availability (Open/Closed/Closing Soon IST evaluation, distanceKm, ETA).
- [x] Display pricing and stock information (no fabricated stock/price when location missing/unserviceable).
- [x] Build responsive layouts & mobile floating basket summary.
- [x] Integrate product, location, stores, and persistent basket APIs.

### Deliverables

- `StoresModule`, `LocationsModule`, and `CartModule` + enhanced `ProductsService`.
- Frontend `LocationContext` (`<Use Current Location>` + reverse geocoding + serviceability + saved addresses) & `BasketContext` (`localStorage` guest merge + server `/cart` persistence + single-store conflict & location switch comparison modals).
- Upgraded storefront pages (`/`, `/categories`, `/categories/[slug]`, `/products/[slug]`, `/stores`, `/stores/[slug]`, `/search`, `/basket`).

### Completion Criteria

Customers must be able to discover products and view valid seller-specific offerings.

---

# 13. Phase 11 — Cart & Checkout

**Priority:** Critical  
**Status:** Completed (Verified on 25 November 2026)

### Objective

Implement single-store cart management, store-switch confirmation, and checkout preparation.

### Tasks

- [x] Implement single-store cart binding (cart bound to `sellerId`).
- [x] Implement store-switch confirmation modal when adding from a different store (clearing existing cart).
- [x] Implement add-to-cart, remove-from-cart, and quantity update APIs.
- [x] Validate store operational hours and open status.
- [x] Validate seller listing availability and price <= MRP.
- [x] Validate minimum order value (MOV).
- [x] Calculate distance-tiered delivery fee based on store radius.
- [x] Validate and apply platform coupons.
- [x] Implement atomic 15-minute inventory reservation (`StockReservation`).
- [x] Handle BullMQ auto-release for abandoned or expired checkout sessions.
- [x] Build cart and checkout summary interfaces.

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
**Status:** Completed (Verified on 25 November 2026)

### Objective

Implement single-store order creation and end-to-end lifecycle management.

### Tasks

- [x] Implement single-store order creation (direct mapping to `sellerId`).
- [x] Implement immutable `OrderItem` snapshots (product title, variant, SKU, price, MRP).
- [x] Implement immutable delivery address snapshot.
- [x] Implement order lifecycle state transitions (`PENDING -> CONFIRMED -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED`).
- [x] Implement store order acceptance and packing workflow.
- [x] Implement lifecycle cancellation rules (free pre-pack, restricted post-pack, locked in transit).
- [x] Implement customer complaint workflows for perishables (3-4h) and packaged goods (24-48h).
- [x] Implement immutable `OrderStatusHistory` audit logs.
- [x] Build customer order details and tracking screens.
- [x] Build seller order packing screens.

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
**Status:** Completed (Verified on 28 November 2026)

### Objective

Integrate the approved payment provider and implement reliable payment processing.

### Tasks

- [x] Configure payment provider.
- [x] Implement payment initiation.
- [x] Implement payment verification.
- [x] Implement webhook handling.
- [x] Verify webhook signatures.
- [x] Implement idempotency.
- [x] Store payment transactions.
- [x] Implement payment status transitions.
- [x] Implement payment failure handling.
- [x] Implement payment retries where appropriate.
- [x] Implement refund workflows.
- [x] Implement COD handling if approved.
- [x] Test duplicate and delayed webhook events.

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
**Status:** Completed (Verified on 28 November 2026)

### Objective

Implement the approved delivery and order fulfillment model.

### Tasks

- [x] Implement fulfillment status management.
- [x] Implement shipment creation if applicable.
- [x] Implement delivery assignment if applicable.
- [x] Implement delivery tracking.
- [x] Implement shipment status updates.
- [x] Implement delivery completion.
- [x] Implement failed delivery handling.
- [x] Implement delivery cancellation.
- [x] Implement delivery notifications.
- [x] Build customer tracking interface.
- [x] Build seller fulfillment interface.
- [x] Test delivery lifecycle.

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
**Status:** Completed (Verified on 28 November 2026)

### Objective

Implement the approved promotional and discount system.

### Tasks

- [x] Implement coupon creation.
- [x] Implement coupon validation.
- [x] Implement coupon expiration.
- [x] Implement minimum order requirements.
- [x] Implement usage limits.
- [x] Implement customer eligibility.
- [x] Implement seller-specific product discounts (`SellerProductDiscount`).
- [x] Implement platform-wide promotions.
- [x] Implement discount calculations.
- [x] Build admin promotion management.
- [x] Test coupon stacking and eligibility rules.

### Deliverables

- Coupon management.
- Discount calculation engine.
- Promotional interfaces.

### Completion Criteria

Discounts must be validated and calculated on the backend according to approved rules.

---

# 18. Phase 16 — Reviews & Ratings

**Priority:** Medium  
**Status:** Completed (Verified on 28 November 2026)

### Objective

Implement a verified-purchase customer review, rating, reporting, and admin moderation system.

### Tasks

- [x] Implement verified-purchase review eligibility (`Order.status === DELIVERED`).
- [x] Implement review creation, editing (with re-moderation), and soft deletion (`REMOVED`).
- [x] Implement duplicate review prevention (`@@unique([userId, productId])`).
- [x] Implement XSS/HTML sanitization and Redis rate limiting.
- [x] Implement review reporting (`ReviewReport`) with duplicate report prevention.
- [x] Implement admin moderation (`APPROVE`, `REJECT`, `HIDE`, `RESTORE`, report resolution) and `ReviewModerationLog`.
- [x] Implement transactional `ProductRatingAggregate` calculation and reconciliation.
- [x] Build PDP `ProductReviewsSection`, Customer `/reviews`, and Admin `/admin/reviews`.
- [x] Test eligibility, concurrency, moderation, reporting, and rating aggregation.

### Deliverables

- Review APIs.
- Rating calculations.
- Review display and moderation.

### Completion Criteria

Only authorized customers must be able to submit reviews according to the approved review policy.

---

# 19. Phase 17 — Notifications

**Priority:** Medium  
**Status:** Completed (28 November 2026)

### Objective

Build the notification system for important customer, seller, and administrative events.

### Tasks

- [x] Define centralized notification event catalog (`NOTIFICATION_EVENTS`).
- [x] Implement persistent in-app notifications (`Notification` + `NotificationBell` + `/notifications`, `/seller/notifications`).
- [x] Implement email notifications via existing `EmailService` (Resend) with HTML-escaped responsive templates.
- [x] Keep SMS and Push behind provider interfaces (`ISmsProvider`, `IPushProvider`) disabled by default pending vendor/platform approval.
- [x] Implement channel-level and category-level notification preferences with mandatory transactional protection.
- [x] Implement transactional outbox (`OutboxEvent`), BullMQ `notifications` worker, Redis-locked outbox sweep, and `NotificationDelivery` tracking.
- [x] Implement exponential backoff + jitter retry handling, permanent vs transient failure classification, and Resend Svix webhook verification.
- [x] Build Customer `/notifications`, Seller `/seller/notifications`, and Admin `/admin/notifications` interfaces.
- [x] Test event catalog, templates, preferences, webhook verification, outbox idempotency, IDOR isolation, and delivery tracking.

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