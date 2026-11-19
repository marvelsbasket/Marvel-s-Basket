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

## ADR-004: Monorepo Architecture & Workspace Tooling

**Status:** Accepted  
**Date:** 2026-11-19  

### Context
Frontend and backend share TypeScript contracts, validation schemas, and database types. Managing independent repositories creates version drift and coordination overhead.

### Decision
Implement a single monorepo using **pnpm workspaces** and **Turborepo** task orchestration.

### Directory Layout
```text
marvels-basket/
├── apps/
│   ├── web/         # Next.js frontend application
│   └── api/         # NestJS backend API application
├── packages/
│   ├── database/    # Prisma schema, migrations, and generated client
│   ├── shared-types/# Common DTOs, enums, and API interfaces
│   └── config/      # Shared ESLint, Prettier, and TypeScript configs
```

### Consequences
- Root-level dependency caching via Turborepo.
- Frontend cannot directly access PostgreSQL; database package is consumed only by `apps/api`.
- Shared types ensure end-to-end type safety without runtime backend coupling.

### Dependencies
- pnpm 9+, Turborepo 2+.

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

# Part C — Complete Decision Register Summary

| ADR # | Decision Topic | Status | Category | Key Implementation Invariant |
|---|---|---|---|---|
| **ADR-001** | Frontend Framework | **Accepted** | Technical | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| **ADR-002** | Backend Architecture | **Accepted** | Technical | NestJS Modular Monolith, REST API (`/api/v1`) |
| **ADR-003** | Database & ORM | **Accepted** | Technical | PostgreSQL 16, Prisma ORM, Decimal monetary types |
| **ADR-004** | Monorepo Structure | **Accepted** | Technical | pnpm workspaces + Turborepo (`apps/web`, `apps/api`) |
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
