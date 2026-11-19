# PROJECT_DECISIONS.md

# Marvel's Basket — Project Decisions & Architecture Records

**Project:** Marvel's Basket  
**Organization:** Marvel's Techworks  
**Document Version:** 1.0  
**Status:** Initial Decision Register  
**Last Updated:** 19 November 2026

---

## 1. Purpose

This document records the important technical and business decisions made during the development of Marvel's Basket.

It serves as the central reference for:

- Confirmed technology choices.
- Architecture decisions.
- Business logic decisions.
- Pending decisions.
- Reasons behind important choices.
- Consequences of decisions.
- Changes to previously approved decisions.

Every significant decision should be documented here to prevent inconsistent implementation across the frontend, backend, and database.

---

## 2. Decision Status Definitions

| Status | Meaning |
|---|---|
| Accepted | Decision has been explicitly approved |
| Proposed | Suggested solution awaiting approval |
| Pending | Information or confirmation is required |
| Rejected | Considered but not selected |
| Superseded | Replaced by a newer decision |

**Important:** A proposed technical design is not an approved business requirement.

---

# Part A — Confirmed Decisions

## ADR-001: Frontend Framework

**Status:** Accepted

### Decision

Use Next.js with TypeScript for the frontend application.

### Rationale

- Supports structured application development.
- Provides server-side rendering and static rendering capabilities.
- Supports reusable components and layouts.
- Provides a strong TypeScript development experience.
- Can support customer, seller, and admin interfaces.

### Consequences

- Frontend code will live inside `apps/web`.
- TypeScript will be used throughout the frontend.
- API communication will happen through the NestJS backend.
- Frontend-specific business logic must not replace backend validation or authorization.

---

## ADR-002: Backend Framework

**Status:** Accepted

### Decision

Use NestJS with TypeScript for backend development.

### Rationale

- Provides a modular architecture.
- Supports dependency injection.
- Encourages separation of responsibilities.
- Supports guards, interceptors, pipes, and middleware.
- Provides a structured foundation for a growing marketplace backend.

### Consequences

- Backend code will live inside `apps/api`.
- Business logic will be organized into NestJS modules.
- Controllers will handle HTTP requests.
- Services will contain application and business logic.
- Database operations will be handled through a dedicated persistence layer.

---

## ADR-003: Database

**Status:** Accepted

### Decision

Use PostgreSQL as the primary relational database.

### Rationale

Marvel's Basket requires reliable relationships between customers, sellers, products, inventory, orders, payments, and transactions.

PostgreSQL provides:

- Relational data integrity.
- Transactions.
- Constraints and indexes.
- Strong querying capabilities.
- Support for structured marketplace data.

### Consequences

- PostgreSQL will be the primary application database.
- Relational integrity must be enforced through appropriate constraints.
- Critical operations must use database transactions where necessary.

---

## ADR-004: ORM

**Status:** Accepted

### Decision

Use Prisma ORM for database access and schema management.

### Rationale

- Type-safe database queries.
- Centralized schema definition.
- Migration management.
- TypeScript integration.
- Structured database access.

### Consequences

- Prisma schema will define the database models.
- Database changes must be managed through migrations.
- Generated Prisma Client will be used by the backend.
- Production database changes must not be made through undocumented manual modifications.

---

## ADR-005: Monorepo Architecture

**Status:** Accepted

### Decision

Use a monorepo architecture containing separate frontend and backend applications.

### Initial Structure

```text
marvels-basket/
│
├── apps/
│   ├── web/
│   │   └── Next.js application
│   │
│   └── api/
│       └── NestJS application
│
├── packages/
│   └── shared/
│       └── Shared utilities and contracts (if required)
│
├── docs/
│   ├── PROJECT_CONTEXT.md
│   ├── PROJECT_REQUIREMENTS.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── PROJECT_STATUS.md
│   ├── PROJECT_DECISIONS.md
│   └── IMPLEMENTATION_PHASES.md
│
├── package.json
├── README.md
└── .gitignore
```

### Rationale

- Centralized project management.
- Easier coordination between frontend and backend.
- Shared TypeScript contracts where appropriate.
- Consistent development standards.
- Simplified repository-level tooling.

### Consequences

- Frontend and backend remain independently organized.
- Shared code must not introduce unnecessary coupling.
- Build, lint, and test commands should support individual applications.

---

# Part B — Provisional Architecture Assumptions

The following decisions are reflected in the initial architecture and database drafts but have not yet been explicitly approved as business rules.

## ADR-006: Marketplace Product Ownership

**Status:** Pending

### Proposed Approach

Maintain a shared platform product catalog with seller-specific product listings.

Under this model:

- The platform maintains the central product catalog.
- Sellers create listings against catalog products.
- Different sellers may offer the same product.
- Each seller controls their own price, availability, and inventory.
- Customers can compare seller offerings.

### Benefits

- Avoids unnecessary product duplication.
- Supports multiple sellers offering the same product.
- Makes product discovery and comparison easier.
- Separates product identity from seller-specific commercial details.

### Pending Confirmation

Should sellers list products from a shared platform catalog, or should each seller independently create and manage their own products?

---

## ADR-007: Multi-Seller Checkout

**Status:** Pending

### Proposed Approach

Support a customer cart containing products from multiple sellers.

A single customer checkout may create:

- One parent order.
- Multiple seller-specific child orders.
- Separate seller-level fulfillment workflows.

### Benefits

- Convenient customer checkout.
- Independent seller order management.
- Easier seller-level delivery tracking.
- Centralized customer order history.

### Pending Confirmation

Should customers be allowed to purchase from multiple sellers in one checkout?

If yes, the payment, shipping, cancellation, refund, and settlement rules must be finalized.

---

## ADR-008: Delivery Management

**Status:** Pending

### Proposed Approach

Support a delivery architecture that can associate fulfillment with individual seller orders.

The exact delivery responsibility is not finalized.

### Possible Models

1. Seller-managed delivery.
2. Platform-managed delivery partners.
3. Hybrid delivery model.

### Pending Confirmation

Who will be responsible for delivering customer orders?

---

## ADR-009: Payment Methods

**Status:** Pending

### Proposed Approach

Support online payment integration and consider Cash on Delivery.

The initial architecture includes payment and refund entities.

### Pending Confirmation

- Which online payment provider will be used?
- Will COD be available?
- Can a single payment cover multiple seller orders?
- How will partial refunds work?
- How will payment failures and retries be handled?

---

# Part C — Technical Decisions Pending Approval

## ADR-010: Authentication Strategy

**Status:** Pending

### Options to Evaluate

- Email and password.
- Mobile number and OTP.
- Google authentication.
- Combined authentication methods.

### Decisions Required

- Customer login methods.
- Seller login methods.
- Admin authentication requirements.
- Email or mobile verification.
- Password reset flow.
- Session and token management.
- Refresh-token strategy.

No authentication provider or exact implementation strategy is finalized in this document.

---

## ADR-011: API Communication

**Status:** Proposed

### Proposed Approach

Use REST APIs for communication between the Next.js frontend and NestJS backend.

### Proposed Standards

- Versioned API routes.
- Consistent request and response structures.
- DTO-based validation.
- Standard HTTP status codes.
- Centralized exception handling.
- API documentation.

### Example Route Structure

```text
/api/v1/auth
/api/v1/users
/api/v1/sellers
/api/v1/products
/api/v1/categories
/api/v1/cart
/api/v1/orders
/api/v1/payments
/api/v1/delivery
/api/v1/admin
```

The final API contract will be documented during implementation.

---

## ADR-012: Authorization and Roles

**Status:** Proposed

### Proposed Roles

- CUSTOMER
- SELLER
- ADMIN
- SUPER_ADMIN

Additional roles may be introduced when actual operational requirements are finalized.

### Proposed Approach

Use backend-enforced role-based access control.

### Security Rules

- Frontend route protection is not sufficient authorization.
- Every protected backend operation must verify the user's permissions.
- Sellers must only access their own authorized resources.
- Customers must only access their own protected data.
- Administrative permissions must be explicitly defined.

---

## ADR-013: Inventory Consistency

**Status:** Proposed

### Proposed Approach

Use transactional database operations for inventory reservation and stock updates.

### Expected Rules

- Prevent overselling.
- Validate available stock before confirming an order.
- Reserve stock during the appropriate checkout stage.
- Release reservations when an order fails or expires.
- Deduct or finalize stock according to the approved order lifecycle.

### Pending Details

- Reservation duration.
- Reservation expiration mechanism.
- Stock deduction timing.
- Handling concurrent checkout requests.
- Handling seller inventory updates during checkout.

---

## ADR-014: Payment and Webhook Reliability

**Status:** Proposed

### Proposed Approach

Payment processing must support idempotency and reliable transaction tracking.

### Expected Rules

- Verify payment status on the backend.
- Verify provider webhook signatures.
- Store transaction references.
- Prevent duplicate payment processing.
- Handle delayed and repeated webhooks.
- Maintain an auditable payment history.
- Reconcile internal payment records with provider records.

The selected provider and exact payment lifecycle remain pending.

---

## ADR-015: Testing Strategy

**Status:** Proposed

### Proposed Testing Layers

| Test Type | Purpose |
|---|---|
| Unit Tests | Validate individual functions and services |
| Integration Tests | Validate interaction between modules and database |
| API Tests | Validate HTTP endpoints and authorization |
| End-to-End Tests | Validate complete customer and seller workflows |
| Security Tests | Identify access-control and data-exposure issues |

Critical workflows must have automated tests before production release.

---

## ADR-016: Deployment Architecture

**Status:** Pending

### Areas Requiring Decisions

- Frontend hosting.
- Backend hosting.
- PostgreSQL hosting.
- Domain and subdomain structure.
- Production environment variables.
- CI/CD pipeline.
- Database backup strategy.
- Logging and monitoring.
- File and image storage.
- Scaling strategy.

The deployment provider and infrastructure configuration have not yet been finalized.

---

# Part D — Business Decisions Pending

## ADR-017: Seller Onboarding

**Status:** Pending

Questions:

- Can anyone register as a seller?
- Is manual admin approval required?
- What business documents are required?
- Is KYC verification required?
- Can sellers operate multiple stores?
- Can one seller have multiple branches?
- What happens when a seller is suspended?

---

## ADR-018: Commission and Seller Settlements

**Status:** Pending

Questions:

- Is the platform commission fixed or percentage-based?
- Can commission vary by category?
- Who bears payment gateway charges?
- How are taxes calculated?
- When do sellers receive payouts?
- How are refunds and cancellations reflected in settlements?
- Are settlements processed automatically or manually?

---

## ADR-019: Pricing and Discounts

**Status:** Pending

Questions:

- Can sellers independently set product prices?
- Can the platform override seller prices?
- Are discounts funded by the seller or platform?
- Can coupons be seller-specific?
- Can coupons apply to multi-seller carts?
- How are minimum order values calculated?

---

## ADR-020: Order Cancellation and Returns

**Status:** Pending

Questions:

- Can customers cancel before seller acceptance?
- Can individual seller orders be cancelled independently?
- Are partial item cancellations supported?
- Are returns supported?
- Who approves return requests?
- What are the refund rules?
- How are damaged or missing items handled?

---

## ADR-021: Delivery Charges and Serviceability

**Status:** Pending

Questions:

- Are delivery charges fixed or distance-based?
- Can different sellers have different delivery charges?
- Is there a minimum order value?
- What delivery radius is supported?
- How are unavailable locations handled?
- Can delivery charges be waived through promotions?

---

# Part E — Decision Management Rules

## 3. How to Record a New Decision

Every significant decision should follow this structure:

```markdown
## ADR-XXX: Decision Title

**Status:** Proposed / Accepted / Rejected / Superseded
**Date:** YYYY-MM-DD
**Owner:** Responsible person or team

### Context
Why is this decision necessary?

### Options Considered
1. Option A
2. Option B
3. Option C

### Decision
What has been selected?

### Rationale
Why was this option selected?

### Consequences
What changes because of this decision?

### Follow-up Actions
What needs to be implemented or updated?
```

## 4. Decision Approval Rules

1. Business-critical decisions must be approved before implementation.
2. Technical decisions must include their reasoning.
3. Pending decisions must not be treated as confirmed requirements.
4. A decision change must be recorded rather than silently replacing the previous decision.
5. Superseded decisions must remain in the document for historical reference.
6. Related documents must be updated when an approved decision changes architecture or requirements.

---

# Part F — Current Decision Summary

| ADR | Decision | Current Status |
|---|---|---|
| ADR-001 | Next.js + TypeScript | Accepted |
| ADR-002 | NestJS + TypeScript | Accepted |
| ADR-003 | PostgreSQL | Accepted |
| ADR-004 | Prisma ORM | Accepted |
| ADR-005 | Monorepo architecture | Accepted |
| ADR-006 | Shared product catalog | Pending |
| ADR-007 | Multi-seller checkout | Pending |
| ADR-008 | Delivery management model | Pending |
| ADR-009 | Payment methods | Pending |
| ADR-010 | Authentication strategy | Pending |
| ADR-011 | REST API | Proposed |
| ADR-012 | Role-based authorization | Proposed |
| ADR-013 | Inventory consistency | Proposed |
| ADR-014 | Payment reliability | Proposed |
| ADR-015 | Testing strategy | Proposed |
| ADR-016 | Deployment architecture | Pending |
| ADR-017 | Seller onboarding | Pending |
| ADR-018 | Commission and settlements | Pending |
| ADR-019 | Pricing and discounts | Pending |
| ADR-020 | Cancellation and returns | Pending |
| ADR-021 | Delivery charges and serviceability | Pending |

---

# 5. Current Decision State

**Confirmed:** Core technology stack and monorepo architecture.

**Proposed:** REST API, role-based authorization, inventory consistency, payment reliability, and testing approach.

**Pending:** Marketplace business model, checkout, payments, delivery, authentication, seller onboarding, commission, pricing, cancellations, and deployment.

**Next Action:** Resolve the business-critical pending decisions before finalizing the database schema and beginning dependent feature implementation.

---

**Document End — PROJECT_DECISIONS.md**