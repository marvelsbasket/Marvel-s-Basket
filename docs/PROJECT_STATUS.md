# PROJECT_STATUS.md

# Marvel's Basket — Project Status & Phase Tracking

**Project:** Marvel's Basket  
**Organization:** Marvel's Techworks  
**Document Version:** 2.0  
**Current Phase:** 00 — Business Rules & Technical Finalization  
**Phase Status:** In Progress (Technical Baseline Completed; Awaiting Owner Confirmation on Commercial Parameters)  
**Last Updated:** 19 November 2026

---

## 1. Project Overview

Marvel's Basket is an online quick-commerce and grocery marketplace operating on an Aggregator / Hybrid model. The system connects customers with independent local grocery stores and supermarkets for fast hyperlocal deliveries (10–30 minute operational target).

The application is architected as a **Containerized Modular Monolith** inside a single monorepo (`apps/web` and `apps/api`), powered by Next.js, NestJS, PostgreSQL 16, Prisma ORM, and Redis 7.

---

## 2. Phase 00 Execution Progress

Phase 00 focuses on finalizing the business model, establishing architectural boundaries, validating database design, and locking implementation scope before dependent code development begins.

### Completed Review & Finalization Tasks

| Area | Status | Verified Outcome |
|---|---|---|
| **Marketplace Product Model** | Finalized | Aggregator / Hybrid Model adopted: Platform master catalog with store-specific listings, pricing (<= MRP), and inventory. |
| **Checkout Architecture** | Finalized | Single-Seller / Single-Store Checkout locked for MVP. Multi-seller parent/sub-orders superseded and removed from MVP scope. |
| **Delivery Model** | Finalized | Platform-Managed Delivery adopted with modular `IDeliveryProvider` abstraction. Milestone-based tracking; live GPS continuous streaming deferred. |
| **Payment Gateway** | Finalized | Razorpay (Cards, UPI, Netbanking) + COD with risk controls. Server-side signature verification and raw-body webhook idempotency. Razorpay Route deferred. |
| **Seller Onboarding & KYC** | Finalized | Admin-Verified Onboarding lifecycle (`DRAFT -> PENDING -> UNDER_REVIEW -> APPROVED / REJECTED` + `SUSPENDED`). PAN, GSTIN, and FSSAI tracking. |
| **Commission & Settlements** | Baseline Finalized | Category-Based Commission (10%–18% baseline) + T+3 settlement cycle + double-entry append-only ledger (`SellerLedgerEntry`). Specific rates pending owner confirmation. |
| **Cancellation & Refunds** | Finalized | Free cancellation pre-pack; restricted post-pack; locked in transit. Photo complaints for perishables (3–4h) and packaged goods (24–48h). Source refunds (5–7 days). Wallet deferred. |
| **Pricing & Discounts** | Finalized | Store selling price <= MRP. Server price snapshots. Platform coupons vs store discounts cleanly separated. |
| **Authentication & AuthZ** | Finalized | Phone OTP (Customers & Riders); Email/Password + Argon2id + rotating refresh tokens (Sellers & Admins); RBAC + tenant isolation. |
| **Deployment Topology** | Finalized | Containerized Modular Monolith (Docker, GitHub Actions, Render/AWS evaluation). |
| **Database Design** | Validated & Updated | Replaced parent-order/seller-order split with clean single-store `Order`, `OrderItem`, single-store `Cart`, `PaymentWebhookEvent`, `SellerLedgerEntry`, and `Delivery`. |
| **Cross-Document Alignment** | Completed | Synchronized across all 7 core project documents. |

---

## 3. Documentation Status Matrix

| # | Document | Version | Status | Key Updates in Phase 00 |
|---|---|---|---|---|
| 1 | `PROJECT_CONTEXT.md` | 1.1 | Updated | Aligned core business model to single-store checkout and hybrid catalog. |
| 2 | `PROJECT_REQUIREMENTS.md` | 2.0 | Updated | Locked MVP scope, single-store cart/order rules, BR-001 to BR-022, edge cases, out-of-scope boundaries. |
| 3 | `TECHNICAL_ARCHITECTURE.md` | 2.0 | Updated | Single-store checkout flow, atomic reservation (15-min TTL), payment verification, delivery abstraction, deployment evaluation. |
| 4 | `DATABASE_SCHEMA.md` | 2.0 | Validated | Streamlined single-store order models, webhook idempotency, double-entry seller ledger, platform delivery models. |
| 5 | `PROJECT_DECISIONS.md` | 2.0 | Updated | Structured ADR-001 through ADR-016 recorded; outstanding commercial questions logged. |
| 6 | `IMPLEMENTATION_PHASES.md` | 2.0 | Updated | Phase 00 checklist updated; Phase 11 & 12 tasks aligned with single-store architecture. |
| 7 | `PROJECT_STATUS.md` | 2.0 | Updated | Current status, task completion tracking, blockers, and next steps. |
| 8 | `PROJECT_DESIGN_SYSTEM.md` | 1.0 | Unchanged | Approved visual direction preserved without modification. |

---

## 4. Outstanding Owner Confirmation Blockers

In accordance with strict Phase 00 completion criteria, the phase remains **In Progress** until the project owner provides written sign-off on the following commercial and operational parameters:

1. **Category Commission Percentages:** Sign off on the exact commission percentage for each product category (proposed baseline: 10%–18%).
2. **Settlement Holding Period:** Sign off on whether seller payouts are disbursed T+3 business days or T+7 business days post-delivery.
3. **Cash on Delivery (COD) Limit:** Sign off on the maximum order cap for COD transactions (proposed: ₹1,500).
4. **Base Delivery Fee & Slabs:** Sign off on distance slabs (e.g., ₹25 for 0–3 km, ₹35 for 3–5 km) and Free Delivery threshold (e.g., ₹499).
5. **Minimum Order Value (MOV):** Sign off on default platform minimum cart value (proposed: ₹149).
6. **Customer Complaint Window:** Sign off on reporting windows for perishables (3–4 hours) vs packaged goods (24–48 hours).
7. **SMS Gateway Vendor:** Sign off on preferred SMS gateway for phone OTP authentication (Fast2SMS / MSG91 / Twilio).
8. **Cloud Hosting Environment:** Confirm preferred production infrastructure provider (Render vs AWS).

---

## 5. Development Phase Roadmap Status

| Phase | Name | Priority | Status | Blockers / Next Dependencies |
|---|---|---|---|---|
| **Phase 00** | Business Rules & Technical Finalization | Critical | **In Progress** | Awaiting Project Owner sign-off on commercial parameters. |
| **Phase 01** | Monorepo & Development Environment | Critical | Not Started | Blocked by Phase 00 sign-off. |
| **Phase 02** | Backend Foundation | Critical | Not Started | Dependent on Phase 01. |
| **Phase 03** | Database Implementation | Critical | Not Started | Dependent on Phase 01 & 02. |
| **Phase 04** | Authentication & Authorization | Critical | Not Started | Dependent on Phase 02 & 03. |
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

## 6. Immediate Next Steps

1. Present the Phase 00 Business Decision Matrix and Outstanding Owner Confirmation Questions to the Project Owner.
2. Receive and record final commercial parameters in `PROJECT_DECISIONS.md`.
3. Mark Phase 00 **COMPLETED** upon receipt of approval.
4. Transition into **Phase 01 — Monorepo & Development Environment Setup**.

---

**Document End — PROJECT_STATUS.md**
