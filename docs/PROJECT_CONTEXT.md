# PROJECT_CONTEXT.md

# MARVEL'S BASKET
## Complete Project Context & Master Reference

| Property | Details |
|---|---|
| Project Name | Marvel's Basket |
| Project ID | MB/MT/2026/001 |
| Project Type | Multi-Vendor E-Commerce & Quick-Commerce Platform |
| Client / Project Owner | Marvel's Basket |
| Development Company | Marvel's Techworks |
| Work Order Date | 14 November 2026 |
| Context Document Version | 1.0 |
| Last Updated | 19 November 2026 |
| Project Status | Planning / Architecture Finalization |

---

# 1. PROJECT OVERVIEW

Marvel's Basket is a multi-vendor online grocery and daily-essentials marketplace being developed by Marvel's Techworks.

The platform aims to connect customers with independent grocery shops, supermarkets and approved vendors through a unified online marketplace.

Multiple sellers will be able to register, manage their shops, list products, maintain inventory, receive orders and fulfil customer purchases.

Customers will be able to discover nearby sellers, browse products, purchase groceries and daily essentials, make payments and track their orders.

The platform will be designed around a quick-commerce model, supporting location-based seller discovery, seller-specific inventory, configurable delivery areas and estimated delivery times.

The system must be modern, responsive, secure, scalable and user-friendly.

## 1.1 Primary Vision

Build a complete, production-ready multi-vendor grocery marketplace with:

- A customer-facing shopping website.
- A multi-vendor seller management dashboard.
- A Super Admin management dashboard.
- A delivery partner interface.
- Location-based product and seller discovery.
- Multi-vendor shopping cart and checkout.
- Seller-specific inventory management.
- Integrated payment and financial management.
- Order management and delivery tracking.
- Reusable backend APIs for future mobile applications.

## 1.2 Core Business Model

Marvel's Basket will operate as a marketplace connecting:

1. Customers who purchase groceries and daily essentials.
2. Sellers who list and fulfil products.
3. Platform administrators who manage marketplace operations.
4. Delivery partners who handle assigned deliveries.

Multiple sellers may operate within the same delivery area.

The platform follows a **Single-Seller / Single-Store Checkout Model** for the MVP: a customer purchases products from one chosen store per order. Store discovery allows customers to browse nearby serviceable stores, compare pricing, and place quick-commerce orders fulfilled directly from that single store's inventory, with delivery managed by the platform.

---

# 2. PROJECT OBJECTIVES

The primary objectives are:

1. Develop a complete multi-vendor e-commerce platform.
2. Enable independent sellers to register and manage their shops.
3. Allow sellers to manage their own products, pricing and inventory.
4. Provide customers with product discovery and shopping functionality.
5. Implement multi-vendor cart and checkout functionality.
6. Support multiple payment methods.
7. Implement seller-wise order processing.
8. Provide location-based seller and product discovery.
9. Implement configurable delivery charges and service areas.
10. Provide delivery partner management.
11. Implement platform commissions and seller earnings.
12. Provide administrative control over marketplace operations.
13. Build reusable APIs for future Android and iOS applications.
14. Maintain security, reliability, performance and scalability.

---

# 3. APPLICATIONS AND USER INTERFACES

The initial website project consists of four primary interfaces.

## 3.1 Customer Website

The customer website is the primary shopping interface.

### Features

- Customer registration and login.
- Homepage and promotional banners.
- Product browsing.
- Category-based navigation.
- Product search and filtering.
- Product details and images.
- Product pricing and offers.
- Seller discovery.
- Seller and shop information.
- Shopping cart.
- Wishlist.
- Multiple delivery addresses.
- Checkout.
- UPI, debit card, credit card and net banking payments.
- Cash on Delivery where enabled.
- Order history.
- Order tracking.
- Ratings and reviews.
- Customer support.

## 3.2 Multi-Vendor Seller Dashboard

The seller dashboard allows independent sellers to manage their shops.

### Features

- Seller registration.
- Seller login.
- KYC and business verification.
- Shop profile management.
- Business details management.
- Product creation.
- Product editing and deletion.
- Product pricing.
- Product images.
- Discounts and offers.
- Inventory management.
- Stock updates.
- Order acceptance and rejection.
- Order processing.
- Sales reports.
- Seller earnings.
- Commission history.
- Settlement history.

### Seller Isolation

Each seller must access only their own business information, products, inventory, orders and financial records.

Seller-level authorization must be enforced on the backend.

## 3.3 Super Admin Dashboard

The Super Admin dashboard provides centralized marketplace management.

### Features

- Dashboard overview.
- Seller management.
- Customer management.
- Order management.
- Seller approval.
- Seller suspension and deactivation.
- Product listing management.
- Category management.
- Commission configuration.
- Delivery charge configuration.
- Refund management.
- Offers and promotions.
- Advertisement and banner management.
- Revenue monitoring.
- Platform performance analytics.
- Report generation and downloads.
- User and role management.
- Audit logs.
- Platform configuration.

## 3.4 Delivery Partner Interface

The delivery partner interface manages delivery operations.

### Features

- Delivery partner registration.
- Partner verification.
- Delivery partner profile.
- Assigned delivery listing.
- Delivery assignment acceptance.
- Pickup status updates.
- Delivery status updates.
- Customer delivery details.
- Delivery history.
- Earnings history.
- Notifications.
- Location-based tracking.

---

# 4. QUICK-COMMERCE BUSINESS REQUIREMENTS

Quick-commerce functionality is a major part of Marvel's Basket.

The platform must support:

### 4.1 Location-Based Discovery

- Discover sellers according to customer location.
- PIN-code-based serviceability.
- Configurable delivery areas.
- Seller-specific delivery radius.
- Location-based product availability.

### 4.2 Seller-Wise Inventory

- Each seller maintains independent inventory.
- Product availability is seller-specific.
- Stock updates are recorded.
- Inventory is validated during checkout.
- Overselling must be prevented.

### 4.3 Marketplace Store Operations

- Multiple independent stores/sellers can operate within the same delivery area.
- Customers discover nearby serviceable stores and can choose their preferred store.
- Each store manages independent inventory, pricing (at or below MRP), and order packing.
- Customers place orders with one store per checkout (single-store checkout for MVP).
- The platform oversees operations, manages delivery, and reconciles financial settlements.

### 4.4 Delivery Management

- Configurable delivery radius.
- Configurable delivery charges.
- Estimated delivery times.
- Customer-facing order status updates.
- Delivery partner assignment.
- Pickup and delivery tracking.

### 4.5 Quick-Commerce Target

The architecture should support a 10–30-minute delivery proposition where local operations make it feasible.

This is an operational target, not a guaranteed delivery-time commitment.

---

# 5. PAYMENT AND FINANCIAL REQUIREMENTS

The initial payment gateway direction is Razorpay, subject to provider approval and account readiness.

## 5.1 Supported Payment Methods

- UPI.
- Debit cards.
- Credit cards.
- Net banking.
- Cash on Delivery where enabled by the administrator.

## 5.2 Financial Management

The platform must support:

- Payment transaction records.
- Payment verification.
- Order-wise commission calculations.
- Seller earnings.
- Settlement records.
- Payout reports.
- Cancellation workflows.
- Full and partial refund workflows where applicable.
- Transaction history.
- Financial reports.

## 5.3 Commission System

The platform must support configurable commissions.

Commission configuration may eventually support:

- Platform-wide commission.
- Seller-specific commission.
- Category-specific commission.

The final commission rules must be approved by the client.

## 5.4 Payment Security

- Server-side payment verification.
- Verified payment gateway webhooks.
- Webhook idempotency.
- Secure transaction records.
- Refund authorization.
- Financial audit history.

Automated marketplace split settlements are not assumed to be included until the payment provider, compliance requirements and commercial arrangements are confirmed.

---

# 6. APPROVED TECHNOLOGY STACK

The following technology stack has been explicitly selected for Marvel's Basket.

| Layer | Approved Technology |
|---|---|
| Frontend | Next.js |
| Frontend Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Backend | NestJS |
| Backend Language | TypeScript |
| API Architecture | REST API |
| Database | PostgreSQL |
| ORM | Prisma |
| Repository Architecture | Monorepo |
| Package Manager | pnpm |

## 6.1 Proposed Supporting Technologies

The following are recommended architectural additions and are subject to implementation and infrastructure approval.

| Area | Proposed Technology |
|---|---|
| Monorepo Build System | Turborepo |
| API Documentation | Swagger / OpenAPI |
| API Validation | class-validator |
| Frontend Validation | Zod |
| Server State | TanStack Query |
| Client State | Zustand |
| Authentication | JWT + Refresh Tokens |
| Authorization | RBAC |
| Caching | Redis |
| Background Jobs | BullMQ |
| Payment Gateway | Razorpay |
| Maps and Location | Google Maps API |
| File Storage | S3-compatible object storage |
| Email Service | Resend |
| Testing | Jest, Supertest, Playwright |
| Local Development | Docker |
| Version Control | Git + GitHub |

The supporting technologies must be recorded in PROJECT_DECISIONS.md when finalized.

---

# 7. MONOREPO ARCHITECTURE

The project will use a single Git repository containing separate frontend and backend applications.

### Repository Name

`marvels-basket`

### High-Level Structure

```text
marvels-basket/
│
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   └── types/
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── common/
│       │   ├── config/
│       │   ├── database/
│       │   ├── modules/
│       │   └── jobs/
│       │
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       │
│       └── package.json
│
├── packages/
│   ├── shared-types/
│   ├── shared-validation/
│   ├── typescript-config/
│   ├── eslint-config/
│   └── utils/
│
├── docs/
├── scripts/
├── docker/
├── .github/
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

### Architecture Rules

1. `apps/web` contains the complete frontend.
2. `apps/api` contains backend business logic and API endpoints.
3. PostgreSQL is accessed through the backend using Prisma.
4. Frontend applications communicate with the backend through REST APIs.
5. Shared packages contain reusable types, validation and utilities.
6. Business logic must not be duplicated between frontend and backend.
7. Backend implementation code must not be directly imported into the frontend.
8. The backend must remain independent of the web application.

---

# 8. BACKEND MODULES

The NestJS backend will follow a modular monolith architecture.

Proposed modules:

```text
modules/
│
├── auth/
├── users/
├── customers/
├── sellers/
├── products/
├── categories/
├── inventory/
├── carts/
├── checkout/
├── orders/
├── payments/
├── refunds/
├── commissions/
├── settlements/
├── deliveries/
├── locations/
├── reviews/
├── offers/
├── notifications/
├── reports/
├── support/
├── audit-logs/
└── admin/
```

Each module must have defined responsibilities, services, controllers, DTOs and tests where applicable.

The initial architecture will use one backend application rather than independently deployed microservices.

---

# 9. DATABASE OVERVIEW

Database: PostgreSQL.

ORM: Prisma.

The database will maintain relational integrity and support transactional operations.

### Major Database Domains

1. Authentication and Users.
2. Customer Management.
3. Seller Management.
4. Product Catalog.
5. Inventory.
6. Shopping Cart.
7. Checkout.
8. Order Management.
9. Payments.
10. Refunds.
11. Commissions.
12. Seller Earnings.
13. Settlements.
14. Delivery Management.
15. Location and Serviceability.
16. Reviews and Ratings.
17. Offers and Coupons.
18. Notifications.
19. Reports.
20. Audit Logs.
21. Platform Settings.

### Important Database Principles

- Use relational constraints.
- Use appropriate indexes.
- Use database transactions for critical operations.
- Use Decimal types for financial amounts.
- Maintain seller-specific inventory.
- Maintain order snapshots.
- Preserve financial transaction history.
- Prevent duplicate payment processing.
- Maintain inventory transaction history.
- Use controlled Prisma migrations.

The final models, fields, indexes and relationships will be defined in DATABASE_SCHEMA.md.

---

# 10. SINGLE-STORE CHECKOUT AND ORDER MODEL

Marvel's Basket follows a **Single-Seller / Single-Store Checkout Model** for the MVP.

A customer adds products from exactly one store to their cart at a time. Every order belongs to exactly one store.

The system supports:

- Platform master product catalog with store-specific listings, pricing, and inventory.
- Single-store shopping cart validation.
- Clear store-switch confirmation prompt if a customer attempts to add an item from another store (explaining that the existing cart will be cleared).
- Direct store order creation (no parent/child split orders in MVP).
- Store-specific inventory reservation and stock deduction.
- Platform-managed delivery dispatch and tracking.
- Independent order status transitions (`PENDING`, `CONFIRMED`, `PACKED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`).
- Full and partial refund workflows associated directly with the order.

### Example

Customer cart:

| Store | Products | Subtotal | Delivery Fee | Total |
|---|---|---:|---:|---:|
| Sharma Grocery (Azamgarh) | Rice (5kg), Milk (2L), Bread | ₹450 | ₹30 | ₹480 |

The platform creates one order directly associated with Sharma Grocery, verified payment, and platform-managed delivery. Multi-seller parent/sub-orders are explicitly deferred from the MVP scope.

---

# 11. DESIGN AND BRANDING

The project work order specifies the following visual direction.

### Brand Colors

- Primary: Dark Green.
- Accent: Bright Lime Green.
- Background: White and Light Grey.

### UI/UX Direction

- Modern and minimal interface.
- Responsive design.
- Mobile-first layouts.
- Modular card-based components.
- Clear navigation.
- Accessible typography.
- Attractive grocery imagery.
- Consistent design language across all dashboards.

### Suggested Initial Design Tokens

```css
:root {
  --brand-primary: #075B36;
  --brand-dark: #03452A;
  --brand-accent: #A7E52E;

  --background: #FFFFFF;
  --surface: #F6F8F5;

  --foreground: #17251C;
  --muted: #6B786F;

  --border: #E2E9E3;
}
```

These are proposed implementation tokens, not a finalized client-approved brand specification.

The supplied website mockup is the initial visual reference. Final layouts, branding assets, content and responsive behaviour require client approval.

---

# 12. SECURITY REQUIREMENTS

Security is a core requirement.

The platform must implement:

- Secure authentication.
- Password hashing.
- Access and refresh token management.
- Role-based access control.
- Backend permission checks.
- Seller resource isolation.
- Input validation.
- Rate limiting.
- Secure file uploads.
- Encrypted network communication.
- Secure credential management.
- Database backup and recovery.
- Error logging.
- Audit logs.
- Payment webhook verification.
- Financial operation authorization.

Customer, seller and financial data must be protected and processed only for authorized project purposes.

Data handling must comply with applicable Indian law.

---

# 13. API ARCHITECTURE

The backend will expose versioned REST APIs.

Initial base path:

`/api/v1`

Major API domains:

```text
/api/v1/auth
/api/v1/users
/api/v1/customers
/api/v1/sellers
/api/v1/products
/api/v1/categories
/api/v1/inventory
/api/v1/cart
/api/v1/checkout
/api/v1/orders
/api/v1/payments
/api/v1/refunds
/api/v1/commissions
/api/v1/settlements
/api/v1/deliveries
/api/v1/locations
/api/v1/reviews
/api/v1/offers
/api/v1/notifications
/api/v1/admin
/api/v1/reports
```

API request and response contracts will be documented separately.

All APIs must enforce authentication, authorization and request validation as applicable.

The API architecture must support future Android and iOS applications without requiring a separate backend implementation.

---

# 14. FUTURE APPLICATION DEVELOPMENT

The current work order covers website development.

The backend, database and APIs must be reusable for future applications.

Planned future applications:

1. Marvel's Basket Android Customer Application.
2. Marvel's Basket iOS Customer Application.
3. Dedicated Seller Application.
4. Dedicated Delivery Partner Application.

Native applications are not included in the current website work order unless separately agreed in writing.

---

# 15. PROJECT DEVELOPMENT ROADMAP

The project will be developed in the following phases.

| Phase | Description |
|---|---|
| Phase 00 | Project Foundation and Planning |
| Phase 01 | Monorepo and Infrastructure Setup |
| Phase 02 | Database Foundation and Authentication |
| Phase 03 | Design System and Frontend Foundation |
| Phase 04 | Seller Onboarding and Management |
| Phase 05 | Product Catalog and Inventory |
| Phase 06 | Customer Storefront and Shopping Cart |
| Phase 07 | Location and Serviceability |
| Phase 08 | Multi-Vendor Checkout and Order Management |
| Phase 09 | Payment and Financial Management |
| Phase 10 | Delivery Partner Management |
| Phase 11 | Admin Dashboard and Business Analytics |
| Phase 12 | Notifications and Automation |
| Phase 13 | Complete Testing and Security Audit |
| Phase 14 | Production Deployment and Handover |

Each phase must have defined requirements, implementation tasks, test cases, completion criteria and documentation updates.

Phase completion must be verified rather than assumed from code implementation alone.

---

# 16. TESTING AND QUALITY ASSURANCE

The project must include:

### Functional Testing
- Customer workflows.
- Seller workflows.
- Admin workflows.
- Delivery partner workflows.
- Checkout and order processing.

### Integration Testing
- Authentication.
- Database operations.
- Payment integration.
- Refund workflows.
- Inventory management.
- Multi-vendor order splitting.

### Security Testing
- Unauthorized access.
- Seller data isolation.
- Privilege escalation.
- Payment webhook verification.
- Input validation.
- Sensitive data exposure.

### Performance Testing
- Product listing.
- Product search.
- Checkout.
- Concurrent inventory operations.
- Order processing.
- Dashboard reporting.

### Responsive Testing
- Desktop.
- Tablet.
- Mobile.

Critical and high-severity unresolved security issues must be addressed before production launch.

---

# 17. DEPLOYMENT AND INFRASTRUCTURE

The project will maintain three environments:

1. Development.
2. Staging.
3. Production.

### Required Infrastructure

- Frontend hosting.
- Backend hosting.
- PostgreSQL database.
- Redis, if adopted.
- Object storage.
- Domain and SSL.
- Logging and monitoring.
- Automated database backups.

### Proposed Domain Structure

```text
marvelsbasket.in
www.marvelsbasket.in
api.marvelsbasket.in
```

The actual domain and hosting provider are yet to be finalized.

### Deployment Principles

- Separate frontend and backend deployment.
- Environment-specific configuration.
- No production credentials in source control.
- Controlled database migrations.
- Automated build and testing.
- Production deployment approval.
- Backup and recovery verification.

---

# 18. SOURCE CODE AND INTELLECTUAL PROPERTY

According to the original work order:

- Project-specific source code, database schemas, designs and deliverables will be assigned to Marvel's Basket upon receipt of agreed payments, subject to the final signed agreement.
- Complete source code must be provided.
- Repository access must be provided.
- Build and deployment instructions must be documented.
- API documentation must be provided.
- Database documentation must be provided.
- Third-party libraries and licences must be disclosed.
- Recurring service fees and external dependencies must be disclosed.
- Domain, hosting and third-party accounts should be under Marvel's Basket's administrative control wherever practicable.

Confidential business, customer, seller and technical information must not be disclosed to unauthorized third parties.

---

# 19. PROJECT DOCUMENTATION STRUCTURE

The following documents will serve as the project's central documentation.

```text
docs/
│
├── PROJECT_CONTEXT.md
├── PROJECT_REQUIREMENTS.md
├── TECHNICAL_ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── PROJECT_STATUS.md
├── PROJECT_DECISIONS.md
└── IMPLEMENTATION_PHASES.md
```

### Document Responsibilities

| Document | Purpose |
|---|---|
| PROJECT_CONTEXT.md | Master project information and background |
| PROJECT_REQUIREMENTS.md | Functional and non-functional requirements |
| TECHNICAL_ARCHITECTURE.md | Application and infrastructure architecture |
| DATABASE_SCHEMA.md | Database models and relationships |
| PROJECT_STATUS.md | Current progress and pending tasks |
| PROJECT_DECISIONS.md | Approved technical and business decisions |
| IMPLEMENTATION_PHASES.md | Detailed development roadmap |

These documents must remain consistent with the actual implementation.

---

# 20. IMPORTANT UNCONFIRMED BUSINESS DECISIONS

The following details are not yet finalized and must not be treated as implemented or approved requirements.

1. Final seller commission structure.
2. Automated marketplace payout arrangement.
3. Seller-managed versus platform-managed delivery.
4. Delivery charge calculation method.
5. Final delivery serviceability rules.
6. Seller cancellation and rejection policies.
7. Customer refund and return policies.
8. COD eligibility rules.
9. Seller KYC document requirements.
10. GST and invoice responsibilities.
11. Shared versus seller-specific product catalog.
12. Platform-funded versus seller-funded discounts.
13. Product search infrastructure.
14. Automated delivery partner assignment.
15. Customer support and dispute management responsibilities.
16. Final hosting and infrastructure providers.
17. Final domain name.
18. Maintenance, warranty and post-launch support terms.

Each approved decision must be recorded in PROJECT_DECISIONS.md.

---

# 21. DEVELOPMENT AND ENGINEERING PRINCIPLES

All development must follow these principles:

### Code Quality
- TypeScript strict mode.
- Consistent coding standards.
- Reusable components.
- Modular backend architecture.
- No unnecessary duplication.
- No hardcoded credentials.

### Backend
- NestJS modular structure.
- DTO-based validation.
- Centralized error handling.
- Secure authorization.
- Transaction-safe operations.
- Documented APIs.

### Frontend
- Reusable UI components.
- Feature-based organization.
- Responsive interfaces.
- Accessible components.
- Consistent design system.
- Proper loading and error states.

### Database
- Prisma migrations.
- Referential integrity.
- Appropriate indexes.
- Transaction-safe inventory.
- Accurate financial records.
- No uncontrolled production schema changes.

### Git Workflow
- `main`: Production-ready code.
- `develop`: Integration branch.
- `feature/*`: Feature development.
- `fix/*`: Bug fixes.
- Pull requests for integration.
- Reviewed and tested changes.

### Project Management
- Work phase by phase.
- Maintain accurate project status.
- Document important decisions.
- Test before marking features complete.
- Record known issues and limitations.
- Obtain approval for scope changes.

---

# 22. CURRENT PROJECT STATUS

**Current Stage:** Initial project planning and documentation.

### Confirmed

- [x] Project name and client identified.
- [x] Original website development work order received.
- [x] Four primary website interfaces identified.
- [x] Next.js + TypeScript selected.
- [x] NestJS selected.
- [x] PostgreSQL + Prisma selected.
- [x] Monorepo architecture selected.
- [x] `apps/web` and `apps/api` structure selected.
- [x] Initial architecture and implementation roadmap prepared.
- [x] Master project context document prepared.

### Pending

- [ ] Final business requirements.
- [ ] Final database schema.
- [ ] Final technical architecture documentation.
- [ ] Supporting infrastructure decisions.
- [ ] Repository creation and initialization.
- [ ] Development environment setup.
- [ ] Client approval of final UI/UX.
- [ ] Commercials and milestone schedule.

### Current Implementation Status

No application implementation or production deployment is confirmed by this document.

The project is currently in the planning and documentation stage.

---

# 23. MASTER PROJECT RULES

This document serves as the central reference for Marvel's Basket.

1. Do not silently change the approved technology stack.
2. Do not introduce new infrastructure without documenting its purpose and approval requirements.
3. Do not treat proposed features as approved business requirements.
4. Do not mark incomplete features as completed.
5. Do not compromise seller data isolation.
6. Do not compromise inventory or payment consistency.
7. Do not implement financial workflows without appropriate auditability.
8. Keep the backend API reusable for future mobile applications.
9. Maintain all seven project documentation files.
10. Record significant technical and business decisions.
11. Keep the actual implementation aligned with approved project scope.
12. Obtain written approval for additional scope and commercial changes.

---

# END OF PROJECT_CONTEXT.md

**Project:** Marvel's Basket  
**Project ID:** MB/MT/2026/001  
**Prepared By:** Marvel's Techworks  
**Document:** PROJECT_CONTEXT.md  
**Version:** 1.0

This document is the master context reference for all future Marvel's Basket development, architecture, implementation, testing and deployment activities.