# PROJECT_DECISIONS.md

# Marvel's Basket — Project Decisions & Architecture Decision Records (ADR)

**Project:** Marvel's Basket  
**Organization:** Marvel's Techworks  
**Document Version:** 2.0  
**Phase:** 00 — Business Rules & Technical Finalization  
**Status:** Approved Technical Baseline & Decision Register  
**Last Updated:** 19 November 2026

---

## 1. Purpose & Decision Governance

This document records the official Architecture Decision Records (ADRs) governing Marvel's Basket. It defines the validated business baseline, system architecture, database design boundaries, and pending business owner decisions.

### Decision Status Legend

| Status | Definition |
|---|---|
| **Accepted** | Formally approved as the technical and architectural baseline for implementation. |
| **Proposed** | Architectural recommendation established for Phase 00, awaiting specific commercial/business parameter sign-off. |
| **Pending Confirmation** | Open business question requiring formal project owner approval before dependent phase execution. |
| **Superseded** | Replaced by a subsequent architectural decision. |
| **Rejected** | Evaluated and explicitly excluded from project scope. |

---

# Part A — Confirmed Baseline Technology Decisions

## ADR-001: Frontend Application Framework

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Marvel's Basket requires a high-performance customer storefront, seller portal, super admin dashboard, and delivery partner interface. The application must support SEO for grocery discovery, fast client interactions for cart operations, and responsive mobile layouts.

### Decision
Use **Next.js (App Router) with TypeScript**, styled with **Tailwind CSS** and **shadcn/ui** component primitives.

### Alternatives Considered
1. *Vite + React SPA:* Lacks native server-side rendering (SSR) and search engine crawlability critical for grocery discovery.
2. *Remix:* Strong full-stack framework, but Next.js offers larger ecosystem maturity, shadcn/ui alignment, and superior standalone container deployment.

### Consequences
- Frontend resides in `apps/web` within the monorepo.
- Pages leverage Server Components for public catalog SEO and Client Components for dynamic cart/checkout state.
- TypeScript strict mode enforced across all UI features.

### Dependencies
- Node.js 20+, pnpm workspaces, shadcn/ui.

---

## ADR-002: Backend Architecture & Framework

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
The backend must handle customer shopping, merchant catalog management, real-time stock reservation, payment verification, commission calculations, and platform delivery dispatch. A structured architecture is required to prevent code degradation as features scale.

### Decision
Use **NestJS with TypeScript** following a **Modular Monolith Architecture** exposing versioned REST APIs (`/api/v1`).

### Alternatives Considered
1. *Express.js / Fastify bare:* Minimalist but lacks built-in dependency injection, modular encapsulation, and enterprise architecture standards.
2. *Microservices (e.g. gRPC / independent services):* Introduces severe premature distributed systems complexity (network partitioning, distributed transactions, multi-repo CI/CD) during MVP.

### Consequences
- Backend resides in `apps/api` within the monorepo.
- Modules (`AuthModule`, `ProductsModule`, `CartModule`, `OrdersModule`, `PaymentsModule`, `DeliveryModule`, `FinanceModule`) maintain strict encapsulation.
- Cross-module operations use direct service injection and transactional boundaries.

### Dependencies
- NestJS v10+, class-validator, class-transformer.

---

## ADR-003: Relational Database & ORM

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
The grocery marketplace requires ACID transactions, referential integrity between orders, listings, payments, and double-entry financial ledgers.

### Decision
Use **PostgreSQL 16** as the relational database and **Prisma ORM** as the database abstraction and migration engine.

### Alternatives Considered
1. *MongoDB:* Document database lacks multi-document relational constraints and requires complex application-level consistency checks for financial ledgers and stock reservations.
2. *TypeORM / Drizzle:* Prisma provides superior type-safe client generation and reliable version-controlled migration management for team collaboration.

### Consequences
- Prisma schema centralized in `packages/database/prisma/schema.prisma`.
- UUID v4 primary keys across all entities.
- All monetary fields use `Decimal(12, 2)`—floating-point types are strictly prohibited.
- Production migrations managed via `prisma migrate deploy`.

### Dependencies
- PostgreSQL 16, Prisma v5/v6.

---

## ADR-004: Monorepo Architecture & npm Workspaces

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Frontend, backend, and infrastructure share TypeScript contracts, validation schemas, domain enums, and database types. Managing independent repositories creates version drift and coordination overhead. However, heavyweight orchestration tooling (Turborepo, Nx) introduces unnecessary abstraction layers and external dependencies for a standard modular monolith.

### Decision
Implement a single monorepo using standard **npm Workspaces** (`"workspaces": ["apps/*", "packages/*"]`) without third-party task runners.

### Directory Layout
```text
marvels-basket/
├── apps/
│   ├── web/         # Next.js frontend application (@marvels-basket/web)
│   └── api/         # NestJS backend API application (@marvels-basket/api)
├── packages/
│   └── shared/      # Shared domain enums, constants, types (@marvels-basket/shared)
├── infrastructure/
│   └── docker/      # Centralized Docker infrastructure (PostgreSQL 16, Redis 7)
├── scripts/         # Centralized orchestration scripts (docker, dev, clean)
└── docs/            # Project architecture and governance documentation
```

### Consequences
- Root-level centralized control for all dev, build, lint, format, and Docker commands.
- Zero dependency on third-party task orchestrators; standard npm CLI commands (`npm run --workspaces`).
- Clean boundary separation: `packages/shared` contains purely agnostic utilities and types, preventing frontend and backend leaks.
- Independent deployability of `apps/web` and `apps/api`.

### Dependencies
- Node.js 20+ (LTS v22 recommended), npm 10+.

---

# Part B — Finalized Business Model & Architectural Baseline Decisions

## ADR-006: Marketplace Product Ownership Model

**Status:** Accepted (MVP Baseline)  
**Date:** 2026-11-19  

### Context
Grocery marketplaces either allow each seller to upload completely isolated products (leading to massive catalog duplication, poor search, and inconsistent photos) or use an aggregator/hybrid master catalog model.

### Decision
Adopt the **Aggregator / Hybrid Marketplace Catalog Model**:
1. **Master Catalog Authority:** The platform Super Admin creates and curates the central master product catalog (standardized brand, product name, category, barcode/EAN, standard attributes, and approved high-res imagery).
2. **Store Product Listings:** Approved merchants search the master catalog and publish store-specific listings (`SellerProduct`).
3. **Store Commercial Control:** Each store independently controls its selling price (must not exceed MRP), stock availability, low-stock threshold, and active operational status.
4. **New Catalog Requests:** If a merchant carries an item absent from the master catalog, they submit a catalog addition request with photos and barcode for Super Admin review.

### Alternatives Considered
- *Pure Decentralized Catalog (Amazon/eBay style):* Every shop creates independent products. Leads to duplicate listings (e.g. 50 different entries for "Amul Butter 500g" with inconsistent titles and blurry photos).
- *Dark Store Inventory Marketplace (Blinkit style):* Platform owns 100% of inventory and warehouses. Rejected for MVP due to heavy capex, lease liabilities, and multi-brand retail regulatory restrictions.

### Consequences
- Clean, unified customer browsing where products have consistent images and descriptions.
- Customers can compare available nearby stores offering the same catalog item.
- Reduced merchant onboarding friction (sellers simply select items from the master catalog and enter their price and stock).

### Dependencies
- Master catalog curation by Super Admin before merchant launch.

---

## ADR-007: Single-Seller / Single-Store Checkout Model

**Status:** Accepted (MVP Baseline)  
**Supersedes:** ADR-007 Draft (Multi-Seller Checkout)  
**Date:** 2026-11-19  

### Context
The initial draft documents proposed a multi-seller cart where a customer could combine items from multiple shops in one cart, generating a parent order and multiple seller child orders. In hyperlocal grocery e-commerce, multi-seller checkout introduces severe operational friction: disparate store preparation speeds, multiple delivery riders arriving at different times, multiplied delivery costs, and complex partial cancellation/refund disputes.

### Decision
Enforce a strict **Single-Seller / Single-Store Checkout Model** for the MVP:
1. A customer can add products from only **one store** to their cart at any given time.
2. Every order placed belongs to **exactly one store**.
3. If a customer attempts to add an item from Store B while items from Store A are in their cart, the UI displays a clear confirmation modal:
   > *"Replace cart items? Your cart contains items from **[Store A]**. Do you want to discard your existing cart and add items from **[Store B]**?"*
4. Upon confirmation, the cart is purged and the new item is added.
5. Multi-seller parent/child order splitting is **explicitly excluded** from the MVP.

### Alternatives Considered
- *Multi-Seller Combined Cart & Parent Orders:* Evaluated and rejected for MVP. Adds massive database complexity (`Order` -> `SellerOrder`), split payments, multi-fleet dispatch, and customer dissatisfaction when one store delays the entire delivery.

### Consequences
- Database schema is dramatically simplified: `Order` maps directly to `sellerId`.
- Fulfillment is atomic and clean: exactly one store packs the order, and one platform rider delivers it within the 10–30 minute quick-commerce SLA.
- Lower delivery fees and transparent customer expectations.

### Dependencies
- Store-specific cart validation in `CartService`.

---

## ADR-008: Platform-Managed Delivery Operations

**Status:** Accepted (MVP Baseline)  
**Date:** 2026-11-19  

### Context
A quick-commerce platform cannot rely on decentralized local grocers to handle their own deliveries without SLA failures. Conversely, hardcoding a single third-party delivery provider creates vendor lock-in.

### Decision
Adopt a **Platform-Managed Delivery Model** with a modular service abstraction:
1. The platform manages delivery assignment, dispatch, tracking, and partner compensation.
2. Delivery logic is encapsulated behind an `IDeliveryProvider` interface.
3. For MVP, deliveries are dispatched to in-house platform delivery partners onboarded through the Delivery Partner Interface.
4. The architecture supports plugging in external 3PL hyperlocal APIs (e.g., Porter, Shadowfax) in future phases without altering order workflows.
5. Live GPS continuous streaming is deferred from MVP; the platform tracks discrete operational milestones (`PENDING` -> `ASSIGNED` -> `ACCEPTED` -> `PICKED_UP` -> `OUT_FOR_DELIVERY` -> `DELIVERED` / `FAILED`).

### Alternatives Considered
- *Seller-Managed Delivery:* Grocers deliver their own orders. Rejected because grocers lack dedicated delivery fleets, causing SLA breaches and zero tracking visibility.
- *Full Real-Time GPS Tracking in MVP:* Evaluated and deferred. Requires WebSocket/MQTT geolocation servers, driver battery consumption, and complex mapping infrastructure not required for initial launch.

### Consequences
- Platform retains quality control over the customer delivery experience.
- Delivery charges are collected centrally by the platform.
- Delivery partners verify handovers via delivery OTP or verified cash collection.

### Dependencies
- Delivery Partner onboarding and admin approval module.

---

## ADR-009: Payment Methods & Gateway Integration

**Status:** Accepted (MVP Baseline)  
**Date:** 2026-11-19  

### Context
Customers in India require diverse payment channels, primarily UPI and Cash on Delivery (COD). Online transactions require bank-grade security, while COD requires risk controls against fraudulent refusals.

### Decision
1. **Primary Payment Gateway:** Integrate **Razorpay** behind an `IPaymentService` interface, supporting UPI (Intent & Collect), Debit/Credit Cards, and Net Banking.
2. **Cash on Delivery (COD):** Supported with strict configurable risk guardrails:
   - Maximum COD order cap (proposed baseline: ₹1,500; configurable in admin settings).
   - Minimum order value (MOV) applies.
   - Disabled for unserviceable PIN codes and customers with repeated refusal history (2+ RTO rejections).
3. **Security Invariant:** Payment status and order status are decoupled. An order is NEVER confirmed based solely on a frontend redirect response.
4. **Verification & Idempotency:** Payment confirmation requires server-side HMAC-SHA256 signature verification and verified raw-body webhook processing with event deduplication in `PaymentWebhookEvent`.
5. **Route Clarification:** Do NOT assume Razorpay Route is available or approved. Central nodal collection + internal ledger calculations + batch payouts will form the initial settlement mechanism.

### Consequences
- Zero financial loss from client-side tampering.
- Resilient to network dropouts during payment checkout.
- Clear separation between payment transactions and order fulfillment states.

### Dependencies
- Active Razorpay merchant account, API keys, and webhook secrets.

---

## ADR-010: Authentication & Authorization Strategy

**Status:** Accepted (MVP Baseline)  
**Date:** 2026-11-19  

### Context
Different platform roles have vastly different ergonomics and security requirements. Mobile shoppers demand friction-free OTP login, whereas merchants and administrators require audit-logged credential access.

### Decision
Implement a role-differentiated authentication and authorization architecture:
1. **Customers & Delivery Partners:** Authenticate via **Mobile Phone Number + 6-digit SMS OTP**.
   - OTP generated and verified via Redis with 5-minute TTL.
   - Rate limiting: max 5 requests/hour per phone, 60-second resend cooldown.
   - Brute-force lockout: 15-minute freeze after 5 consecutive failures.
2. **Sellers & Administrators:** Authenticate via **Business Email + Password**.
   - Passwords hashed using Argon2id.
   - Stateless JWT Access Token (15-minute lifespan).
   - Stateful Rotating Refresh Token (7-day lifespan) stored hashed in PostgreSQL and delivered via secure `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
   - Refresh token reuse detection: invalidates all sessions if a revoked token is replayed.
3. **Backend Authorization:** Role-Based Access Control (RBAC) enforced via NestJS guards (`JwtAuthGuard`, `RolesGuard`). Cross-tenant seller queries must enforce `WHERE sellerId = :authenticatedSellerId`.

### Consequences
- High checkout conversion for phone-first Indian grocery shoppers.
- Bulletproof administrative and merchant session security.
- Elimination of credential-based brute-force attacks on consumer accounts.

### Dependencies
- SMS Gateway integration (Fast2SMS / MSG91) and Redis cache.

---

## ADR-011: Containerized Modular Monolith Deployment Architecture

**Status:** Accepted (MVP Baseline)  
**Date:** 2026-11-19  

### Context
The platform needs a reliable, cost-effective, and maintainable deployment topology for launch without incurring high DevOps overhead.

### Decision
Deploy Marvel's Basket as a **Containerized Modular Monolith**:
1. Single monorepo built into container images via Docker:
   - `apps/web`: Next.js standalone container.
   - `apps/api`: NestJS backend container.
2. Managed Infrastructure:
   - PostgreSQL 16 (Managed database with automated daily backups and point-in-time recovery).
   - Redis 7 (Caching, rate-limiting, and BullMQ background job queues).
   - S3-compatible Object Storage for product images and encrypted KYC documents.
3. Hosting Evaluation: **Render** is approved as the primary MVP hosting candidate due to native Docker support, predictable cost, integrated Redis/Postgres, zero-downtime deploys, and rollback capabilities. AWS (ECS/RDS) is established as the target scaling migration path post-MVP.

### Consequences
- Fast deployment pipeline orchestrated by GitHub Actions.
- Reproducible local development using Docker Compose.
- Avoids microservices overhead while keeping clean modular boundaries for future extraction.

### Dependencies
- Docker, GitHub Actions, Cloud provider account.

---

## ADR-012: Admin-Verified Seller Onboarding & KYC Governance

**Status:** Accepted (MVP Baseline)  
**Date:** 2026-11-19  

### Context
Unregulated merchant onboarding exposes the marketplace to counterfeit goods, expired food sales, tax non-compliance, and financial liability under Indian e-commerce consumer protection laws.

### Decision
Implement a mandatory **Admin-Verified Seller Onboarding Lifecycle**:
1. **Onboarding State Machine:**
   `DRAFT` ──> `PENDING` ──> `UNDER_REVIEW` ──┬──> `APPROVED` ──> `SUSPENDED`
                                              └──> `REJECTED`
2. **Mandatory Documentation:**
   - Trade / Store Name and Owner Contact Details.
   - Physical Store Address with verified geographic coordinates and PIN code.
   - Permanent Account Number (PAN) of business / proprietor.
   - GSTIN registration (mandatory unless qualifying for statutory exemption under GST rules).
   - FSSAI License / Registration (mandatory for grocery and food sales under FSS Act).
   - Bank Account verification (account number, IFSC, account name, cancelled cheque / statement).
3. **Operational Lockdown:** Unapproved sellers (`status != APPROVED`) are barred from publishing listings or accepting customer orders.
4. **Data Protection:** Merchant bank details and KYC documents must be encrypted at rest and accessible only by Super Admin.

### Consequences
- Strict compliance with Indian regulatory and food safety standards.
- Full auditability of merchant approvals and suspensions.
- Elimination of unverified or fraudulent seller accounts.

### Dependencies
- Super Admin verification workflows in Admin Dashboard.

---

## ADR-013: Category-Based Commission & Double-Entry Financial Ledger

**Status:** Proposed (Baseline Adopted; Category Rates Pending Owner Confirmation)  
**Date:** 2026-11-19  

### Context
Marketplace revenue relies on transaction commissions. Inaccurate, mutable, or floating-point financial tracking leads to reconciliation disputes, tax penalties, and merchant distrust.

### Decision
Implement a **Category-Based Commission Engine** and an **Immutable Double-Entry Ledger**:
1. **Category Commission:** Commission is configured per product category in platform settings (proposed baseline range: 10%–18%; exact rates configurable).
2. **Commission Base:** Calculated strictly on the gross store item price of delivered goods (`SUM(quantity * sellingPrice)`). Delivery fees and regulatory taxes do not form part of the platform commission base.
3. **Double-Entry Ledger:** Every financial transaction creates an append-only `SellerLedgerEntry` recording credit/debit, transaction type, reference order ID, and running balance.
4. **Settlement Cycle:** Proposed T+3 business days following order delivery (`DELIVERED` status).
5. **Settlement Holds:** Automated payout holds enforced if an order has an active customer dispute, if the seller's KYC/bank details are incomplete, or if the merchant's ledger balance is negative.
6. **Cost Allocation Matrix:**
   - Platform Coupons: Funded 100% by Marvel's Basket.
   - Store Discounts (< MRP): Funded 100% by the seller.
   - Gateway Fees (~2%): Absorbed by platform operations from commission.
   - Product Quality Refunds: Debited 100% from seller ledger.
   - Transit Loss / RTO: Absorbed by platform operations.

### Consequences
- Exact financial auditability and zero reconciliation discrepancies.
- Historical settlements are completely decoupled from mutable order records.
- Flexible commission governance without code deployments.

### Dependencies
- Owner sign-off on specific category commission percentages and settlement cycle.

---

## ADR-014: Order Cancellation, Complaints & Source Refund Policy

**Status:** Accepted (MVP Baseline)  
**Date:** 2026-11-19  

### Context
Hyperlocal grocery orders require strict operational boundaries for cancellation. Perishable items cannot be restocked once packed or dispatched.

### Decision
Adopt a **Lifecycle-Based Cancellation and Source Refund Policy**:
1. **Cancellation Boundaries:**
   - *Pre-Packing (`PENDING`, `CONFIRMED`):* Customer has unconditional free cancellation rights from the web UI. Reserved inventory is restored, and an immediate full source refund is triggered.
   - *Post-Packing (`PACKED`):* Customer self-service cancellation is disabled. Store has expended packing resources; cancellation requires support intervention.
   - *In Transit (`OUT_FOR_DELIVERY`):* Customer cancellation is strictly prohibited.
2. **Store Cancellation / Rejection:** Permitted only before packing with a mandatory administrative reason. Triggers immediate customer notification, full refund, and merchant performance logging.
3. **Customer Quality Complaints:**
   - Perishables (Fruits, Vegetables, Dairy): Complaints must be lodged within **3–4 hours** of delivery with clear photo evidence.
   - Non-Perishables (Staples, Packaged FMCG): Complaints must be lodged within **24–48 hours** of delivery with photo evidence.
4. **Refund Processing:** All refunds are issued to the **original payment source** via Razorpay Refunds API (5–7 business days). Stored-value customer wallets are deferred from the MVP to eliminate RBI prepaid payment regulatory compliance.

### Consequences
- Prevents merchant food spoilage losses from late customer cancellations.
- Clear evidentiary requirements for customer quality claims.
- Seamless, automated source refunds via payment gateway.

### Dependencies
- Razorpay Refunds API integration.

---

## ADR-015: Store-Level Pricing & Discount Governance

**Status:** Accepted (MVP Baseline)  
**Date:** 2026-11-19  

### Context
In India, the Legal Metrology Act strictly prohibits selling packaged goods above the Maximum Retail Price (MRP). Furthermore, cart calculations must be impervious to client-side manipulation.

### Decision
1. **Store-Specific Pricing:** Each store sets its selling price for each listing.
2. **MRP Invariant:** Store selling price must be **less than or equal to MRP** (`sellingPrice <= mrp`). Backend validation rejects any listing mutation violating this rule.
3. **Immutable Price Snapshots:** At checkout, item prices, MRPs, and product titles are frozen inside `OrderItem` snapshots. Subsequent price updates by the merchant do not mutate existing order records.
4. **Promotional Governance:**
   - Platform coupons are managed globally by Super Admin with configurable spend thresholds, expiration dates, and usage limits.
   - Stacking rules: Only one coupon can be applied per checkout. Invalid combinations are rejected server-side.

### Consequences
- 100% compliance with Indian retail pricing regulations.
- Protection against price tampering during checkout.
- Historical price auditability for disputes and accounting.

### Dependencies
- Master catalog MRP metadata.

---

## ADR-016: Hyperlocal Location & Serviceability Architecture

**Status:** Accepted (MVP Baseline)  
**Date:** 2026-11-19  

### Context
Quick-commerce delivery within 10–30 minutes is physically impossible if customers order from stores located across town.

### Decision
Implement **Coordinate and PIN-Code-Based Hyperlocal Serviceability**:
1. **Location Selection:** Customer enters delivery address, landmark, PIN code, and selects map location via Google Maps Platform API.
2. **Serviceability Pipeline:**
   - System checks if the customer PIN code belongs to active platform operating zones.
   - System queries active approved stores whose configured delivery radius (e.g., 3–5 km) encompasses the customer's coordinates (using Haversine distance formula in PostgreSQL).
3. **Distance-Tiered Delivery Fee:**
   - 0 – 3 km: Base delivery fee (proposed baseline: ₹25–₹30).
   - 3 – 5 km: Base fee + incremental fee.
   - Beyond store delivery radius: Marked unserviceable ("Store does not deliver to this location").
4. **Free Delivery Threshold:** Configurable platform cart subtotal threshold (e.g., free delivery above ₹499); platform funds the delivery charge.

### Consequences
- Customers only discover and purchase from stores that can fulfill within the delivery SLA.
- Transparent, distance-fair delivery pricing.

### Dependencies
- Google Maps API key (Places, Geocoding, Distance Matrix).

---

## ADR-017: Centralized Root-Level Docker Orchestration

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Developers need a frictionless workflow for starting, stopping, inspecting, and managing local container dependencies without navigating between disparate subdirectories. Decentralized Compose setups lead to environment inconsistencies, port conflicts, and unmanaged container drift.

### Decision
Organize all Docker Compose infrastructure under `infrastructure/docker/` and expose the entire lifecycle via standardized root `package.json` scripts (`docker:up`, `docker:down`, `docker:restart`, `docker:ps`, `docker:logs`, `docker:health`, `docker:reset`, `docker:clean`) orchestrated by `scripts/docker/manage.js`.

### Consequences
- Developers interact exclusively with the repository root.
- The Compose configuration remains modular (`compose.yaml`, `compose.override.yaml`, `compose.production.yaml`).
- All scripts work cross-platform on macOS, Linux, and Windows environments with Node.js.

---

## ADR-018: PostgreSQL 16 & Redis 7 Containerization

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Marvel's Basket relies on PostgreSQL 16 for relational data and Redis 7 for high-speed caching and cart reservations. Requiring manual host installation introduces version mismatches and setup friction.

### Decision
Containerize PostgreSQL (`postgres:16-alpine`) and Redis (`redis:7-alpine`) using official lightweight Alpine images with automated health checks (`pg_isready` and `redis-cli ping`).

### Consequences
- Consistent database and cache runtimes across all development and testing environments.
- Automated database extension initialization (`uuid-ossp`, `pgcrypto`) via `/docker-entrypoint-initdb.d`.
- Redis configured with Append-Only File (AOF) persistence and memory caps via custom `redis.conf`.

---

## ADR-019: Isolated Container Networking

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Containers need to communicate seamlessly using internal DNS aliases while remaining isolated from other Docker projects on the developer's machine.

### Decision
Define a dedicated user-defined bridge network named `marvels_basket_network` for all project containers.

### Consequences
- Predictable internal DNS resolution (`postgres`, `redis`).
- No host network namespace pollution.
- Development host port publishing is isolated to `compose.override.yaml`.

---

## ADR-020: Persistent Named Volumes & Destructive Reset Protection

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Developers frequently stop and restart their development environments. Standard teardowns must never inadvertently destroy local database records, test accounts, or seed data. Conversely, an explicit command is needed to completely purge data when resetting local state.

### Decision
Use named persistent volumes (`marvels_basket_postgres_data` and `marvels_basket_redis_data`).
1. `npm run docker:down` strictly halts containers while preserving all named volumes.
2. `npm run docker:reset` is explicitly destructive, requiring either an interactive typed confirmation (`DELETE`) or a `--confirm` flag in CI/CD environments.

### Consequences
- Accidental data loss during routine shutdowns is completely prevented.
- Complete environment wipe is preserved for intentional resets with clear safeguards.

---

## ADR-021: Shared Code Boundaries & Workspace Package Resolution

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Code shared between frontend (`apps/web`) and backend (`apps/api`) must remain strictly modular to prevent backend business logic or database drivers from leaking into the customer client bundle.

### Decision
Establish `packages/shared` (`@marvels-basket/shared`) containing only platform-wide enums, constants, and TypeScript interfaces. Framework-specific dependencies (Next.js, NestJS, Prisma) are strictly forbidden in `packages/shared`.

### Consequences
- Zero backend bundle leakage into the Next.js client.
- Single source of truth for order statuses, payment methods, user roles, and business rule constants.
- Resolved via npm workspaces and TypeScript path mappings.

---

## ADR-022: Multi-Tier Environment Variable Management

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Different applications and services require distinct environment variables, while developers need a single root template to bootstrap the system.

### Decision
1. Maintain `.env.example` at the repository root as the canonical documentation and quickstart template.
2. Maintain localized `.env.example` templates within `apps/web/`, `apps/api/`, and `infrastructure/docker/`.
3. The Docker orchestration script (`manage.js`) automatically reads root `.env` or falls back gracefully.
4. `.env` and all secret files are strictly excluded from git via `.gitignore`.

### Consequences
- Clear onboarding for new engineers.
- Zero risk of secret leakage to version control.

---

## ADR-023: URI-Based API Versioning & Route Prefixing

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Client applications (web storefront, seller portal, mobile apps) require predictable API contracts that can evolve over time without breaking backwards compatibility.

### Decision
Implement explicit URI versioning (`VersioningType.URI`) with a global prefix `api` and default version `1`, yielding all REST endpoints under `/api/v1/*`.

### Consequences
- Uniform endpoint structure across all controllers (e.g. `/api/v1/health`, `/api/v1/orders`).
- Seamless migration path for future `v2` endpoints without disruptive breaking changes.
- Swagger documentation cleanly groups versioned routes.

---

## ADR-024: Standardized API Response & Centralized Error Envelope

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Clients need consistent response shapes for both successful operations and error states. Inconsistent payload formats force clients to write brittle error-checking logic.

### Decision
1. Implement a global `TransformInterceptor` that wraps all successful controller responses in a standard `{ success: true, statusCode, message, data, meta?, timestamp, path, correlationId }` envelope.
2. Implement an `@BypassTransform()` decorator to bypass wrapping when returning raw file streams or downloads.
3. Implement a global `AllExceptionsFilter` that catches all exceptions (NestJS HttpExceptions, class-validator errors, Prisma client errors, and runtime failures), mapping them into a uniform `{ success: false, statusCode, code, message, errors?, timestamp, path, correlationId }` structure.

### Consequences
- Frontend and mobile clients consume a 100% predictable response contract.
- Internal database details, SQL queries, and stack traces are suppressed in production.
- Validation failures produce structured field-level error arrays (`[{ field, message }]`).

---

## ADR-025: Request Correlation Tracking & Structured Audit Logging

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
In distributed or high-throughput marketplace operations, diagnosing customer complaints or tracking order failures across logs requires end-to-end request traceability.

### Decision
Implement `CorrelationIdMiddleware` to extract or generate a UUID v4 correlation ID (`x-correlation-id`) on every incoming request. Set this header on the HTTP response, attach it to request context, and include it in all structured `LoggingInterceptor` log entries and error envelopes.

### Consequences
- Unambiguous correlation of client-reported errors to server logs.
- Sensitive values (passwords, tokens, payment secrets) are strictly masked from logs.

---

## ADR-026: Typed Configuration & Strict Schema Validation

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Misconfigured environment variables (missing secrets, invalid ports, malformed database URLs) can cause silent failures or security vulnerabilities in production.

### Decision
Use NestJS `ConfigModule` coupled with a strict **Joi validation schema** and typed configuration factory (`RootConfig`). Validate all environment variables on application bootstrap and terminate startup with clear diagnostic errors if validation fails.

### Consequences
- Fail-fast guarantee: the backend will never run in a partially configured or unsafe state.
- Enforced minimum secret lengths (e.g. `JWT_SECRET` >= 32 characters) and typed port numbers.

---

## ADR-027: Dual-Probe Health Check Architecture (Liveness & Readiness)

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Container orchestrators and uptime monitoring tools require distinct probes: one to check if the Node.js process is alive, and another to verify if the application is ready to accept user traffic.

### Decision
Implement two dedicated health probes under `/api/v1/health`:
1. **Liveness (`/health/live`):** Verifies the process is responsive without querying dependencies.
2. **Readiness (`/health/ready`):** Actively checks PostgreSQL via `prisma.$queryRaw` and Redis via `redis.ping()`. If either dependency is unavailable, returns HTTP 503 (`ServiceUnavailableException`) with component-level statuses.

### Consequences
- Container orchestrators can restart stalled processes without prematurely killing healthy instances during dependency initialization.
- No sensitive database URLs or credentials are leaked in health responses.

---

## ADR-028: Global Infrastructure Encapsulation (Prisma & Redis Services)

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Direct, uncontrolled database or cache connections from controllers lead to connection leaks, lack of graceful shutdown, and scattered error handling.

### Decision
Encapsulate PostgreSQL in a `@Global()` `PrismaModule` (`PrismaService` extending `PrismaClient`) and Redis in a `@Global()` `RedisModule` (`RedisService` wrapping `ioredis`). Manage connection lifecycle via `onModuleInit` and graceful disconnection via `onModuleDestroy`. Controllers are strictly forbidden from direct database/cache access.

### Consequences
- Centralized connection pooling and lifecycle hooks.
- Graceful shutdown handles in-flight transactions on `SIGTERM` / `SIGINT`.
- Reusable, testable cache and database abstractions available across all future feature modules.

---

## ADR-029: Database Identifier & UUID v4 Strategy

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Using sequential integer primary keys exposes business volume to competitors (e.g. order ID enumeration, user ID enumeration) and creates vulnerability to IDOR attacks. In a distributed multi-entity marketplace, globally unique identifiers are required across all relational tables.

### Decision
1. All database primary keys use PostgreSQL UUID v4 (`@id @default(uuid()) @db.Uuid`).
2. Foreign key columns use `@db.Uuid` with explicit naming (`*_id`).
3. User-facing identifiers (e.g. Order Numbers `MB-2026-XXXXX`, Settlement Numbers `SETTL-2026-XXXXX`, Refund Numbers `RFND-2026-XXXXX`) are stored as separate unique strings.

---

## ADR-030: Decimal Monetary Precision Standard

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Floating-point arithmetic (`FLOAT`, `DOUBLE`) in IEEE 754 suffers from binary representation rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`), which is unacceptable for financial balances, taxes, commissions, and customer billing.

### Decision
1. All monetary fields in the PostgreSQL database use `Decimal(12, 2)` (supporting values up to ₹9,999,999,999.99 with exact 2-decimal-place precision).
2. Commission rates use `Decimal(5, 2)` (supporting percentages up to `100.00%`).
3. Geographic coordinates use `Decimal(10, 8)` for latitude and `Decimal(11, 8)` for longitude.
4. Float and Double types are strictly prohibited for financial or accounting values.

---

## ADR-031: Nullable Composite Listing Uniqueness via Partial Unique Index

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
In the hybrid catalog model, a `SellerProduct` represents an offer by a store for a master `Product`, with an optional `variantId` (nullable when the product has no variant). Under standard SQL and PostgreSQL defaults, `NULL != NULL`, meaning a composite unique constraint `@@unique([sellerId, productId, variantId])` does not prevent duplicate rows where `variantId IS NULL`.

### Decision
1. In addition to the Prisma composite unique constraint `@@unique([sellerId, productId, variantId])` for non-null variants, apply a PostgreSQL partial unique index via migration:
   ```sql
   CREATE UNIQUE INDEX "seller_products_seller_id_product_id_null_variant_key"
   ON "seller_products"("seller_id", "product_id")
   WHERE "variant_id" IS NULL;
   ```
2. This guarantees that no store can list the same master product twice without a variant, preventing duplicate catalog offers and inventory fragmentation.

---

## ADR-032: Single-Store Shopping Cart & Order Relational Boundary

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
To support the approved single-store checkout model (ADR-007), the database schema must strictly enforce store boundaries on customer carts and orders, eliminating multi-seller parent/sub-order split complexity for the MVP.

### Decision
1. `Cart` maintains a foreign key `sellerId` referencing `Seller(id)` (nullable only when the cart is completely empty).
2. `CartItem` unique constraint `@@unique([cartId, sellerProductId])` guarantees a listing is not duplicated in a cart.
3. `Order` maintains `sellerId` referencing `Seller(id)` with `onDelete: Restrict`, ensuring every order maps directly to exactly one store.
4. Intermediate `SellerOrder` child tables are eliminated for the MVP.

---

## ADR-033: Immutable Historical Order Item & Address Snapshots

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Merchants frequently update store selling prices, MRPs, or titles. Customers may also update or delete their saved delivery addresses. If orders rely solely on mutable foreign-key lookups, historical invoices, audit trails, and financial reconciliation will become corrupted.

### Decision
1. `OrderItem` freezes immutable snapshots at the moment of checkout:
   - `productNameSnapshot`: Master product title.
   - `variantNameSnapshot`: Variant specification.
   - `skuSnapshot`: SKU.
   - `unitPrice`: Frozen store selling price (`Decimal(12, 2)`).
   - `mrp`: Frozen MRP (`Decimal(12, 2)`).
   - `totalAmount`: Frozen line total (`unitPrice * quantity`).
2. `Order` stores `addressSnapshot` as frozen JSON containing the exact recipient name, phone, full address, city, PIN code, and GPS coordinates.
3. `OrderItem` and `Order` foreign keys use `onDelete: Restrict` to prevent deletion of customer or product references from destroying order history.

---

## ADR-034: Double-Entry Append-Only Financial Ledger & Double-Settlement Guard

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Auditable merchant payouts require an immutable financial trail. Relying on mutable order totals for merchant payouts risks duplicate disbursements, race conditions, or unrecorded dispute deductions.

### Decision
1. `SellerLedgerEntry` is strictly append-only. Rows are never modified or deleted.
2. Every financial event generates a ledger entry:
   - `ORDER_CREDIT`: Store item revenue credited upon delivery.
   - `COMMISSION_DEBIT`: Platform commission and GST deducted.
   - `REFUND_DEBIT`: Customer refund deducted from merchant.
   - `SETTLEMENT_PAYOUT`: Disbursement to merchant bank account.
3. `SettlementItem` maintains a unique constraint `@@unique([sellerLedgerEntryId])`. This database-level invariant strictly prevents any ledger credit from being bundled into more than one settlement batch.

---

## ADR-035: Asynchronous Payment Webhook Idempotency Architecture

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Payment gateways (e.g. Razorpay) send asynchronous webhooks for payment capture, failure, and refunds. Under network retries or gateway replays, the webhook endpoint may receive identical events multiple times, risking duplicate order confirmation or duplicate financial ledger credits.

### Decision
1. `PaymentWebhookEvent` stores incoming webhook events with a composite unique constraint:
   `@@unique([provider, eventId])`
2. Every incoming webhook handler queries or attempts an insert before processing. If a duplicate `(provider, eventId)` is detected, the transaction terminates idempotently with HTTP 200 without re-executing order or financial mutations.

---

## ADR-036: Password Hashing using Argon2id

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
User passwords require robust, modern cryptographic hashing resistant to GPU, FPGA, and ASIC-accelerated brute-force attacks, side-channel timing attacks, and rainbow tables. Legacy algorithms like bcrypt or PBKDF2 are less memory-hard than Argon2id.

### Decision
1. Passwords must be hashed using **Argon2id** (`argon2` package, `type: argon2.argon2id`).
2. Parameters calibrated for production: `memoryCost: 65536` (64 MB), `timeCost: 3`, `parallelism: 4`.
3. To mitigate user enumeration via timing discrepancies on failed logins, the system executes a constant-time dummy verification hash when a requested email does not exist.

---

## ADR-037: Email Verification using Single-Use OTP via Resend with Redis Rate Limiting

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
User email verification must be reliable, vendor-portable, resistant to abuse, and non-blocking. Mobile/SMS OTP involves telecommunication aggregator complexities and costs that are premature for Phase 04 backend foundations.

### Decision
1. Registration requires email verification before account login is permitted (enforced by HTTP 403 Forbidden).
2. Mobile phone verification is explicitly postponed and kept out of scope for Phase 04.
3. Verification uses a cryptographically secure 6-digit numeric OTP (`crypto.randomInt(100000, 1000000)`).
4. Plaintext OTPs are never stored. The SHA-256 hash of the OTP is cached in Redis with a 5-minute TTL (`otp:verify-email:<email>`).
5. A 60-second cooldown key is enforced between OTP generation requests (`otp:cooldown:verify-email:<email>`).
6. Maximum 5 failed verification attempts allowed; exceeding this threshold immediately deletes the cached OTP.
7. Outbound email delivery is managed through **Resend** Node SDK via a dedicated `EmailModule`, with automatic fallback to mock/sandbox mode during testing.

---

## ADR-038: Refresh Token Rotation with Token Family Reuse Detection (RFC 6749)

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Long-lived refresh tokens present a major security risk if intercepted by malicious actors. Without token rotation and reuse detection, a compromised refresh token allows persistent unauthorized session renewal.

### Decision
1. The platform adopts a dual-token model:
   - **Access Token:** Short-lived stateless JWT (15 minutes).
   - **Refresh Token:** Long-lived stateful opaque 80-character hex string (7 days).
2. Raw refresh tokens are never persisted in the database; only SHA-256 hashes are stored in the PostgreSQL `Session` table.
3. Refresh tokens are transported via `HttpOnly`, `SameSite=lax`, `Secure` (in production) cookies, scoped to `/api/v1/auth`.
4. The `Session` model tracks `token_family_id` (migration `20261119081743_session_token_family`).
5. On every refresh, the presented token is invalidated (`revokedAt = now()`), and a new session is created inheriting the same `token_family_id`.
6. **RFC 6749 Reuse Detection:** If a previously revoked refresh token is presented, the system flags a replay attack and immediately revokes all active sessions in that `token_family_id`.

---

## ADR-039: Global Declarative Guard Architecture with Public Decorator Bypass

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Individual controller route protection can easily lead to accidental security lapses if a developer omits `@UseGuards(JwtAuthGuard)`. A secure-by-default architecture requires all endpoints to be protected unless explicitly designated public.

### Decision
1. `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard` are registered globally as `APP_GUARD` in `AppModule`.
2. All endpoints are authenticated by default. Endpoints intended for open access must be explicitly annotated with `@Public()`.
3. `@Roles(...UserRoleType[])` and `@Permissions(...string[])` decorators enable declarative, granular access control.
4. `SUPER_ADMIN` has platform-wide bypass across all role-protected endpoints.

---

# Part C — Complete Decision Register Summary

| ADR # | Decision Topic | Status | Category | Key Implementation Invariant |
|---|---|---|---|---|
| **ADR-001** | Frontend Framework | **Accepted** | Technical | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| **ADR-002** | Backend Architecture | **Accepted** | Technical | NestJS Modular Monolith, REST API (`/api/v1`) |
| **ADR-003** | Database & ORM | **Accepted** | Technical | PostgreSQL 16, Prisma ORM, Decimal monetary types |
| **ADR-004** | Monorepo Structure | **Accepted** | Technical | npm Workspaces (`apps/*`, `packages/*`), centralized scripts |
| **ADR-005** | Monorepo Architecture | **Accepted** | Technical | Separation of concerns, shared packages without backend leaks |
| **ADR-006** | Product Ownership | **Accepted** | Business | Hybrid Master Catalog + Store-specific listings & inventory |
| **ADR-007** | Checkout Model | **Accepted** | Business | Single-Store Checkout (Multi-seller parent/sub-orders superseded) |
| **ADR-008** | Delivery Model | **Accepted** | Business | Platform-Managed Delivery with modular provider abstraction |
| **ADR-009** | Payment Methods & PG | **Accepted** | Business/Tech | Razorpay (Cards/UPI/Netbanking) + COD with limits; Route deferred |
| **ADR-010** | Authentication | **Accepted** | Business/Tech | Phone OTP (Customers/Riders); Email/Password + JWT (Sellers/Admins) |
| **ADR-011** | Deployment Topology | **Accepted** | Technical | Containerized Modular Monolith (Docker, GitHub Actions, Render/AWS) |
| **ADR-012** | Seller Onboarding & KYC | **Accepted** | Business | Admin-verified onboarding (`DRAFT` to `APPROVED`), PAN, GSTIN, FSSAI |
| **ADR-013** | Commission & Ledger | **Proposed** | Business/Finance | Category commission (10%–18%), T+3 settlement, double-entry ledger |
| **ADR-014** | Cancellation & Refunds | **Accepted** | Business | Free pre-pack; restricted post-pack; source refunds (5–7 days); no wallet |
| **ADR-015** | Pricing & Discounts | **Accepted** | Business | Store selling price <= MRP; server price snapshots; platform coupons |
| **ADR-016** | Hyperlocal Serviceability| **Accepted** | Business/Tech | Store radius + PIN code filtering; distance-tiered delivery fees |
| **ADR-017** | Centralized Docker Orchestration | **Accepted** | Infrastructure | Root-level `npm run docker:*` commands via `manage.js` |
| **ADR-018** | Postgres 16 & Redis 7 Services | **Accepted** | Infrastructure | Official Alpine container images with healthcheck probes |
| **ADR-019** | Container Bridge Network | **Accepted** | Infrastructure | Dedicated `marvels_basket_network` bridge with internal DNS |
| **ADR-020** | Persistent Volumes & Reset Guard | **Accepted** | Infrastructure | Named volumes preserved on down; reset requires typed confirmation |
| **ADR-021** | Shared Code Boundaries | **Accepted** | Architecture | `@marvels-basket/shared` holds domain enums & constants only |
| **ADR-022** | Environment Config Strategy | **Accepted** | Configuration | Multi-tier `.env.example` templates; root `.env` orchestration |
| **ADR-023** | URI API Versioning | **Accepted** | Backend Architecture | `/api/v1/*` routes using NestJS VersioningType.URI |
| **ADR-024** | Standard API Response Envelope | **Accepted** | Backend Architecture | TransformInterceptor & AllExceptionsFilter contracts |
| **ADR-025** | Request Correlation Tracking | **Accepted** | Observability | UUID v4 `x-correlation-id` in logs, headers, and responses |
| **ADR-026** | Typed Configuration Validation | **Accepted** | Configuration | Joi schema validation with fail-fast bootstrap guarantee |
| **ADR-027** | Dual-Probe Health System | **Accepted** | Monitoring | `/health/live` process probe & `/health/ready` DB/Redis probe |
| **ADR-028** | Infrastructure Encapsulation | **Accepted** | Database/Cache | Global PrismaService and RedisService with lifecycle hooks |
| **ADR-029** | Database Primary Key Strategy | **Accepted** | Database | PostgreSQL UUID v4 (`@default(uuid()) @db.Uuid`) |
| **ADR-030** | Monetary Precision Standard | **Accepted** | Database/Finance | PostgreSQL `Decimal(12, 2)` for all monetary fields |
| **ADR-031** | Nullable Composite Listing Uniqueness | **Accepted** | Database | Partial unique index for null variants on `seller_products` |
| **ADR-032** | Single-Store Cart & Order Boundary | **Accepted** | Database/Business | Store foreign key on Cart & Order; no split sub-orders |
| **ADR-033** | Immutable Order Snapshots | **Accepted** | Database/Audit | Frozen price, SKU, product title, and address snapshots |
| **ADR-034** | Double-Entry Financial Ledger | **Accepted** | Database/Finance | Append-only SellerLedgerEntry; unique `sellerLedgerEntryId` on SettlementItem |
| **ADR-035** | Payment Webhook Idempotency | **Accepted** | Database/Payments | Unique constraint on `PaymentWebhookEvent(provider, eventId)` |
| **ADR-036** | Password Hashing using Argon2id | **Accepted** | Security/Auth | Argon2id (`memoryCost: 65536, timeCost: 3, parallelism: 4`) with timing attack mitigation |
| **ADR-037** | Email OTP Verification via Resend | **Accepted** | Security/Auth | 6-digit numeric OTP via Resend, SHA-256 in Redis, 5m TTL, 60s cooldown, 5-attempt limit |
| **ADR-038** | Refresh Token Rotation & Family Reuse Detection | **Accepted** | Security/Auth | Opaque 80-char hex in HttpOnly cookie; `token_family_id` tracks lineage and revokes family on reuse |
| **ADR-039** | Global Declarative Guard Architecture | **Accepted** | Security/Auth | `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` as APP_GUARD with `@Public()` bypass |

---

# Part D — Outstanding Business Owner Confirmations

The following commercial and operational parameters require formal sign-off from Marvel's Basket leadership before starting dependent phases:

1. **Category Commission Percentages:** Confirm exact commission percentage per category (e.g., Staples: 10%, Fruits & Veg: 12%, Dairy: 10%, Personal Care: 18%).
2. **Settlement Holding Period:** Confirm whether the settlement cycle is T+3 business days or T+7 business days post-delivery.
3. **Cash on Delivery (COD) Threshold:** Confirm the maximum order cap for COD transactions (recommended: ₹1,500).
4. **Base Delivery Fee & Slabs:** Confirm distance fee rates (e.g., ₹25 for 0–3 km, ₹35 for 3–5 km) and Free Delivery cart threshold (e.g., ₹499).
5. **Minimum Order Value (MOV):** Confirm platform default minimum order value (recommended: ₹149).
6. **Customer Complaint Window:** Confirm the acceptable reporting window for perishable goods (recommended: 3–4 hours) vs packaged goods (recommended: 24–48 hours).
7. **SMS Gateway Vendor:** Confirm preferred SMS provider for customer OTP authentication (Fast2SMS vs MSG91 vs Twilio).
8. **Cloud Hosting Environment:** Confirm deployment infrastructure provider for production (Render vs AWS).

---

**Document End — PROJECT_DECISIONS.md**
