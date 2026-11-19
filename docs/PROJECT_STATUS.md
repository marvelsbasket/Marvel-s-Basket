# PROJECT_STATUS.md

# Marvel's Basket — Project Status & Phase Tracking

**Project:** Marvel's Basket  
**Organization:** Marvel's Techworks  
**Document Version:** 2.2  
**Current Phase:** Phase 02 — Backend Foundation  
**Phase Status:** Completed (Phase 02 Verified; Ready for Phase 03)  
**Last Updated:** 19 November 2026

---

## 1. Project Overview

Marvel's Basket is an online quick-commerce and grocery marketplace operating on an Aggregator / Hybrid model. The system connects customers with independent local grocery stores and supermarkets for fast hyperlocal deliveries (10–30 minute operational target).

The application is architected as a **Containerized Modular Monolith** inside an **npm Workspaces monorepo** (`apps/web`, `apps/api`, and `packages/shared`), powered by Next.js 15, NestJS 10, PostgreSQL 16, Prisma ORM, and Redis 7.

---

## 2. Phase 02 Execution & Verification Summary

**Phase Status:** **COMPLETED** (Verified on 19 November 2026)

Phase 02 established the production NestJS backend architecture, centralized exception handling, standardized API responses, request correlation tracking, typed Joi configuration validation, global Prisma and Redis services, dual-probe health monitoring, Swagger documentation, and automated unit/E2E test suites.

### Verified Deliverables & Test Results

| Area | Status | Verified Outcome |
|---|---|---|
| **Application Bootstrap & Versioning** | Verified | Asynchronous bootstrap in `main.ts` with URI versioning (`v1`) under `/api` global prefix, producing uniform endpoints under `/api/v1/*`. Graceful shutdown hooks active. |
| **Security & Headers** | Verified | `helmet` integration configured with CSP, HSTS, X-Content-Type-Options, and Frameguard. CORS active for allowed origins (`http://localhost:3000`). Request body limits configured (`10mb`). |
| **Request Correlation & Logging** | Verified | `CorrelationIdMiddleware` extracts or generates UUID v4 correlation IDs (`x-correlation-id`). `LoggingInterceptor` captures execution latency, HTTP method, URL, and correlation ID while masking sensitive fields. |
| **Centralized Error Handling** | Verified | `AllExceptionsFilter` catches NestJS `HttpException`, class-validator `BadRequestException`, Prisma `PrismaClientKnownRequestError`, and runtime failures, returning standardized `{ success: false, statusCode, code, message, errors?, timestamp, path, correlationId }`. |
| **Standardized Response Envelope** | Verified | `TransformInterceptor` wraps successful responses in `{ success: true, statusCode, message, data, meta?, timestamp, path, correlationId }`. Supports `@BypassTransform()` for raw streams and `@ResponseMessage()`. |
| **Global Request Validation** | Verified | `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, and custom `validationExceptionFactory` formatting clean field errors. |
| **Environment Configuration** | Verified | `ConfigModule` coupled with strict **Joi validation schema** and typed `RootConfig`. Fails fast on startup if required variables (`DATABASE_URL`, `JWT_SECRET` min 32 chars) are missing or invalid. |
| **Database Foundation (Prisma)** | Verified | Global `PrismaModule` & `PrismaService` managing `$connect()` on init, `$disconnect()` on destroy, and raw query (`SELECT 1`) health probe. |
| **Cache Foundation (Redis)** | Verified | Global `RedisModule` & `RedisService` wrapping `ioredis` with exponential backoff retry, error event listeners, graceful `quit()`, and `ping()` health probe. |
| **Dual-Probe Health Monitoring** | Verified | `GET /api/v1/health` (general summary), `GET /api/v1/health/live` (process liveness), and `GET /api/v1/health/ready` (active PostgreSQL and Redis probes returning 200 when healthy, 503 if degraded). |
| **OpenAPI / Swagger Documentation** | Verified | Interactive Swagger UI available at `http://localhost:4000/api/docs` and OpenAPI 3.0 JSON specification at `/api/docs-json`, enabled via `SWAGGER_ENABLED`. |
| **Unit Testing Suite** | Verified | 15 unit tests passing (4 suites) covering health service, configuration validation, exception filter, and response interceptor. |
| **E2E Testing Suite** | Verified | 7 E2E tests passing covering health endpoints, correlation ID propagation, Swagger docs, and 404 error envelope. |
| **Monorepo Build & Check** | Verified | `npm run check` (format check, lint, typecheck, build) executed and passed with 0 errors across all workspaces. |

---

## 2. Phase 03 — Database Implementation Summary

| Area | Status | Verified Outcome |
|---|---|---|
| **Prisma Schema Definition** | Verified | Complete marketplace relational domain baseline in `apps/api/prisma/schema.prisma` with 54 relational tables, 21 enums, explicit foreign key constraints, and cascade behaviors. |
| **PostgreSQL 16 Engine** | Verified | Running via Docker container `marvels_basket_postgres` on host port 5433, internal port 5432 with health check probes. |
| **Database Migrations** | Verified | 3 versioned Prisma migrations applied: `20261119074339_init`, `20261119074630_role_and_payment_enums`, and `20261119075000_seller_product_null_variant_unique`. Schema in full sync. |
| **Monetary Standards** | Verified | All monetary values use PostgreSQL `Decimal(12, 2)` (supporting values up to ₹9,999,999,999.99). Commission rates use `Decimal(5, 2)`. Float/Double strictly prohibited. |
| **Marketplace Business Invariants** | Verified | Single-store checkout boundary (`Cart.sellerId`, `Order.sellerId`), immutable historical price & address snapshots, double-entry append-only seller ledger (`SellerLedgerEntry`), and double-settlement guard (`SettlementItem.sellerLedgerEntryId` unique). |
| **Nullable Uniqueness Guarantee** | Verified | PostgreSQL partial unique index on `seller_products(seller_id, product_id) WHERE variant_id IS NULL` guarantees a store cannot create duplicate listings for the same master product. |
| **Webhook Idempotency Guarantee** | Verified | Unique composite index on `payment_webhook_events(provider, event_id)` prevents gateway replay attacks and duplicate payment captures. |
| **Deterministic Development Seed** | Verified | `apps/api/prisma/seed.ts` seeds superadmin, sample customer (with profile and addresses), 2 stores with multi-store listings and distinct pricing, delivery rider, categories, master products, inventories, commission rules, coupons, and platform settings. 100% idempotent. |
| **Database Integrity Tests** | Verified | 10 database integration tests passing (1 suite in `apps/api/test/database-integrity.db-spec.ts`) validating schema, foreign keys, multi-store listings, single-store cart, price snapshots, webhook idempotency, ledger entries, rider assignment, and atomic rollback. |
| **Root Management Tooling** | Verified | Standardized commands added to root `package.json`: `db:validate`, `db:format`, `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:seed`, `db:status`, `db:test`, and `db:studio`. |

---

## 3. Documentation Status Matrix

| # | Document | Version | Status | Key Updates in Phase 00, 01, 02 & 03 |
|---|---|---|---|---|
| 1 | `PROJECT_CONTEXT.md` | 1.1 | Updated | Aligned core business model to single-store checkout and hybrid catalog. |
| 2 | `PROJECT_REQUIREMENTS.md` | 2.0 | Updated | Locked MVP scope, single-store cart/order rules, BR-001 to BR-022, edge cases, out-of-scope boundaries. |
| 3 | `TECHNICAL_ARCHITECTURE.md` | 2.2 | Updated | Added Section 6.7 documenting Database Implementation, migrations, partial indexes, and root tooling. |
| 4 | `DATABASE_SCHEMA.md` | 2.1 | Validated | Streamlined single-store order models, webhook idempotency, double-entry seller ledger, partial unique index. |
| 5 | `PROJECT_DECISIONS.md` | 2.3 | Updated | Added **ADR-029** through **ADR-035** (UUID v4 keys, Decimal precision, partial unique index, single-store boundary, immutable snapshots, financial ledger, webhook idempotency). |
| 6 | `IMPLEMENTATION_PHASES.md` | 2.3 | Updated | Phase 03 marked Completed with full task verification; Phase 04 unblocked. |
| 7 | `PROJECT_STATUS.md` | 2.3 | Updated | Phase 03 completed; database verified; Phase 04 ready to start. |
| 8 | `PROJECT_DESIGN_SYSTEM.md` | 1.0 | Preserved | Approved visual direction preserved without modification; implemented in `apps/web`. |
| 9 | `README.md` | 2.2 | Updated | Added database management commands, Prisma migration guides, and seed instructions. |
| 10 | `infrastructure/docker/README.md`| 1.0 | Created | Dedicated Docker architecture, volume lifecycle, health probes, and safety commands. |
| 11 | `apps/api/README.md` | 1.1 | Updated | Added database models, migration commands, and testing conventions. |

---

## 4. Development Phase Roadmap Status

| Phase | Name | Priority | Status | Blockers / Next Dependencies |
|---|---|---|---|---|
| **Phase 00** | Business Rules & Technical Finalization | Critical | **Completed** | Technical baseline locked; commercial parameters documented in ADRs. |
| **Phase 01** | Monorepo & Development Environment | Critical | **Completed** | Monorepo initialized, Docker active, all checks passing. |
| **Phase 02** | Backend Foundation | Critical | **Completed** | NestJS architecture, Prisma/Redis services, Swagger, tests passing. |
| **Phase 03** | Database Implementation | Critical | **Completed** | 54 tables, 21 enums, 3 migrations, seed data, 10/10 DB tests passing. |
| **Phase 04** | Authentication & Authorization | Critical | **Ready to Start** | Unblocked by Phase 02 & Phase 03 completion. |
| **Phase 05** | Frontend Foundation & Design System | High | Not Started | Dependent on Phase 01. |
| **Phase 06** | User & Profile Management | High | Not Started | Dependent on Phase 04 & 05. |
| **Phase 07** | Seller Onboarding & KYC | High | Not Started | Dependent on Phase 04. |
| **Phase 08** | Product Catalog & Categories | High | Not Started | Dependent on Phase 07. |
| **Phase 09** | Seller Listings & Inventory | High | Not Started | Dependent on Phase 08. |
| **Phase 10** | Customer Shopping Experience | High | Not Started | Dependent on Phase 08 & 09. |
| **Phase 11** | Cart & Checkout (Single Store) | Critical | Not Started | Dependent on Phase 09 & 10. |
| **Phase 12** | Order Management | Critical | Not Started | Dependent on Phase 11. |
| **Phase 13** | Payment Integration (Razorpay + COD) | Critical | Not Started | Dependent on Phase 12. |
| **Phase 14** | Delivery & Fulfillment | High | Not Started | Dependent on Phase 12. |
| **Phase 15** | Coupons & Promotions | Medium | Not Started | Dependent on Phase 11. |
| **Phase 16** | Reviews & Ratings | Medium | Not Started | Dependent on Phase 12. |
| **Phase 17** | Notifications | Medium | Not Started | Dependent on Phase 12 & 13. |
| **Phase 18** | Seller Dashboard | High | Not Started | Dependent on Phase 07–14. |
| **Phase 19** | Super Admin Dashboard | High | Not Started | Dependent on Phase 07–15. |
| **Phase 20** | Financial Management & Settlements | High | Not Started | Dependent on Phase 13. |
| **Phase 21** | Testing & Security Hardening | Critical | Not Started | Dependent on all features. |
| **Phase 22** | Deployment & Production Launch | Critical | Not Started | Dependent on Phase 21. |
| **Phase 23** | Post-Launch Monitoring | High | Not Started | Dependent on Phase 22. |

---

## 5. Immediate Next Steps

1. Transition to **Phase 03 — Database Implementation**:
   - Implement the complete relational schema from `docs/DATABASE_SCHEMA.md` in `apps/api/prisma/schema.prisma` (Users, Profiles, Stores, Categories, Products, Listings, Carts, Orders, Payments, Delivery, Ledgers).
   - Create initial Prisma migration (`prisma migrate dev`).
   - Create database seeding scripts for platform categories, test stores, admin accounts, and sample products.
   - Verify referential integrity, indexes, and decimal monetary constraints in PostgreSQL.

---

**Document End — PROJECT_STATUS.md**
