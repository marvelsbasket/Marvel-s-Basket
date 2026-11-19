# PROJECT_REQUIREMENTS.md

# MARVEL'S BASKET
## Software Requirements Specification (SRS)

| Property | Details |
|---|---|
| Project Name | Marvel's Basket |
| Project ID | MB/MT/2026/001 |
| Project Type | Multi-Vendor E-Commerce & Quick-Commerce Platform |
| Client | Marvel's Basket |
| Development Company | Marvel's Techworks |
| Document | PROJECT_REQUIREMENTS.md |
| Version | 1.0 |
| Created Date | 19 November 2026 |
| Status | Initial Requirements Draft |

---

# 1. INTRODUCTION

## 1.1 Purpose

This document defines the functional and non-functional requirements of Marvel's Basket.

It specifies what the platform must do, how its different users will interact with the system, the business rules governing operations and the expected behaviour of individual modules.

This document will be used by developers, testers, project managers and stakeholders throughout the development lifecycle.

## 1.2 Project Description

Marvel's Basket is a multi-vendor grocery and daily-essentials marketplace that connects customers with independent grocery stores, supermarkets and approved sellers.

Customers can discover nearby sellers, browse products, add items to their shopping cart, place orders and receive deliveries.

Sellers can independently manage their shops, products, inventory, pricing and orders.

Administrators can control marketplace operations, sellers, customers, products, commissions, payments, delivery operations and platform analytics.

Delivery partners can manage assigned deliveries and update delivery progress.

The platform will initially be delivered as a responsive website with backend APIs designed to support future Android and iOS applications.

## 1.3 Project Scope

The MVP development scope includes:

1. Customer Website (Next.js responsive web application).
2. Multi-Vendor Seller Dashboard (Store management, listings, inventory, and order fulfillment).
3. Super Admin Dashboard (Platform governance, seller KYC approvals, catalog, commission, delivery rules, and audit logs).
4. Delivery Partner Interface (Assigned delivery management, status updates, and proof of delivery).
5. Modular Monolith NestJS REST API.
6. PostgreSQL Database with Prisma ORM.
7. Payment Gateway Integration (Razorpay for Cards, UPI, Net Banking + Cash on Delivery with configurable limits).
8. Location-Based Store and Product Discovery.
9. Single-Seller / Single-Store Cart and Checkout with atomic inventory reservation.
10. Platform-Managed Delivery Operations with modular provider abstraction.
11. Financial Management (Category-based commissions, seller ledgers, payout holds, and auditable settlement batches).
12. Customer Complaints, Cancellation & Source Refund Workflows.
13. Complete Automated Testing and Security Hardening.
14. Containerized Production Deployment (Docker, GitHub Actions CI/CD).
15. Technical Documentation and Handover.

Explicitly Out of Scope for MVP:
- Multi-seller combined cart and checkout (parent orders with seller sub-orders).
- Customer stored-value internal wallet or credit system.
- Live GPS location streaming/tracking of delivery riders.
- Automated instant marketplace split payouts (e.g. Razorpay Route before operational eligibility confirmation).
- Native mobile applications (iOS/Android).

---

# 2. USER ROLES AND ACCESS CONTROL

The platform will support four primary user categories.

## 2.1 Customer

Customers use the platform to discover products and purchase groceries.

Permissions:

- Register and log in.
- Manage personal profile.
- Manage delivery addresses.
- Browse products.
- Search products.
- Discover sellers.
- Manage shopping cart.
- Apply available coupons.
- Place orders.
- Make payments.
- Track orders.
- Cancel eligible orders.
- Request eligible refunds or returns.
- Submit ratings and reviews.
- View order history.
- Contact support.

Customers must only access their own personal information, addresses, orders and transactions.

## 2.2 Seller

Sellers manage their own shops and fulfilment operations.

Permissions:

- Register as a seller.
- Submit KYC information.
- Manage shop information.
- Manage business details.
- Create and update products.
- Manage product prices.
- Manage inventory.
- Receive orders.
- Accept or reject orders according to platform rules.
- Update order preparation status.
- View sales reports.
- View commissions.
- View earnings.
- View settlement history.

Sellers must never access another seller's private business information or records.

## 2.3 Super Admin

Super Admin has complete platform-level control.

Permissions:

- Manage customers.
- Manage sellers.
- Approve or reject seller applications.
- Suspend or activate accounts.
- Manage products and categories.
- Manage orders.
- Manage commissions.
- Manage payments and refunds.
- Manage delivery operations.
- Manage offers and coupons.
- Manage homepage banners.
- Manage platform settings.
- View analytics and reports.
- Manage administrative users and roles.
- View audit logs.

## 2.4 Delivery Partner

Delivery partners handle assigned delivery operations.

Permissions:

- Register or be registered by administrators.
- Submit verification information.
- Manage profile.
- View assigned deliveries.
- Accept or reject eligible delivery assignments.
- View pickup details.
- View customer delivery information for assigned deliveries.
- Update pickup status.
- Update delivery status.
- View delivery history.
- View earnings history.

Delivery partners must only access information necessary for their assigned deliveries.

---

# 3. AUTHENTICATION AND USER MANAGEMENT

Module ID: AUTH

## 3.1 Authentication Strategy (Phase 04 Approved Baseline)

The platform implements a unified, high-security email-and-password authentication model with email OTP verification across all user roles, intentionally excluding SMS OTP dependencies:

| Role | Primary Authentication Method | Credential Type | Verification Requirement |
|---|---|---|---|
| Customer | Email + Password | Argon2id Hash | 6-digit Email OTP via Resend (5 min expiry) |
| Seller | Business Email + Password | Argon2id Hash | 6-digit Email OTP via Resend + Admin Approval |
| Delivery Partner | Email + Password | Argon2id Hash | 6-digit Email OTP via Resend + KYC Approval |
| Admin / Super Admin | Email + Strong Password | Argon2id Hash | Role permission verification (MFA-ready) |

> **Note on Mobile Verification:** Mobile phone number verification via SMS OTP is explicitly excluded from Phase 04 scope. Optional phone numbers collected at registration are stored as contact information only. No SMS gateway integration or SMS endpoints are implemented in Phase 04.

## 3.2 Email Verification OTP Workflow (Resend + Redis)

Requirements:
- User registers with full name, email, and strong password (min 8 characters, requiring uppercase, lowercase, number, and special character).
- System dispatches a cryptographically secure 6-digit numeric OTP (`crypto.randomInt(100000, 1000000)`) via **Resend** transactional email.
- Unverified users are rejected at login with HTTP 403 Forbidden until email verification is complete.
- OTP expiry: exactly 5 minutes (300 seconds TTL).
- Resend cooldown: minimum 60 seconds before requesting a fresh OTP.
- Maximum attempts: 5 incorrect attempts before the OTP is permanently invalidated in Redis.
- OTP storage: Stored in Redis as a SHA-256 hash (`otp:verify-email:<email>`). Plaintext OTPs are never stored in databases or cache.
- Auditing: A persistent audit record is logged in PostgreSQL `verification_tokens` table (`type: EMAIL_VERIFICATION`).

## 3.3 Session Management & Token Rotation Workflow

Requirements:
- Authentication via `/api/v1/auth/login` verifies credentials using Argon2id with constant-time failure response against account enumeration.
- **Access Token:** Short-lived JWT (15 minutes) containing `{ sub, email, roles, permissions, sessionId, tokenFamilyId }`, returned in JSON response body.
- **Refresh Token:** Long-lived (7 days) opaque 80-character hex string stored as a SHA-256 hash in PostgreSQL `sessions` table.
- **Cookie Security:** Refresh token delivered exclusively via `HttpOnly`, `SameSite=lax`, `Secure` (in production) cookie scoped to `/api/v1/auth`.
- **RFC 6749 Token Family Rotation:** On every refresh (`/api/v1/auth/refresh`), the used session is marked `revokedAt = now()`, and a new refresh token and session are generated under the same `token_family_id`.
- **Reuse Detection:** If a previously revoked refresh token is presented, the system detects a compromise, immediately revoking all active sessions sharing that `token_family_id` and rejecting the request with HTTP 401 Unauthorized.
- **Logout:** Single-session logout (`/api/v1/auth/logout`) revokes the current session and clears the cookie; multi-device logout (`/api/v1/auth/logout-all`) revokes all active sessions for the user.
- **Password Reset:** Generates a 64-character cryptographic token (15-min TTL) sent via Resend. Consuming the token updates the password and revokes all active sessions.

## 3.4 Authorization & RBAC

The system must implement strict backend Role-Based Access Control (RBAC):

- Available Roles: `CUSTOMER`, `SELLER`, `DELIVERY_PARTNER`, `ADMIN`, `SUPER_ADMIN`.
- Authorization must be enforced exclusively by NestJS guards (`JwtAuthGuard`, `RolesGuard`) and policies on the server side.
- Frontend route guards are purely user-experience aids and must never be relied upon for security.
- Seller Isolation: Every query and mutation executed by a seller must filter strictly by the authenticated seller's verified `sellerId`.
- Customer Isolation: Customers can only query or mutate orders, addresses, and profiles belonging to their own `userId`.

All authorization checks must be performed on the backend.

---

# 4. CUSTOMER WEBSITE REQUIREMENTS

Module ID: CUSTOMER

## 4.1 Homepage

The homepage must display:

- Brand logo.
- Navigation bar.
- Delivery location selector.
- Product search.
- Login/account option.
- Shopping cart.
- Product categories.
- Promotional banners.
- Special offers.
- Featured products.
- Featured sellers.
- Best-selling products.
- Recently added products.
- Relevant delivery information.
- Footer and informational links.

Homepage content must be manageable through the admin dashboard wherever applicable.

## 4.2 Product Categories

Customers must be able to browse products by category.

Initial suggested categories:

- Groceries.
- Fruits and Vegetables.
- Dairy and Bakery.
- Snacks and Beverages.
- Personal Care.
- Home and Cleaning.
- Baby Care.
- Other Essentials.

Requirements:

- Category listing.
- Category images.
- Category-specific product listing.
- Nested categories and subcategories.
- Active/inactive category management.
- Category sorting.
- Category-based filtering.

The final category structure will be managed by administrators.

## 4.3 Product Listing

Each product listing should support:

- Product name.
- Product image.
- Product description.
- Product category.
- Seller information.
- Selling price.
- Original price, if applicable.
- Discount information.
- Available stock.
- Product unit or variant.
- Availability status.
- Rating information where available.

The same catalog product may be offered by multiple sellers at different prices and availability levels.

The customer must be able to identify which seller is fulfilling a product.

## 4.4 Product Search

Requirements:

- Search by product name.
- Search by relevant keywords.
- Category-based filtering.
- Seller-based filtering.
- Price filtering.
- Availability filtering.
- Sorting by price.
- Sorting by popularity.
- Sorting by relevance.

Search results must respect customer serviceability and product availability.

## 4.5 Product Details

The product details page must display:

- Product name.
- Product images.
- Product description.
- Available variants.
- Seller information.
- Price.
- Discount.
- Stock availability.
- Quantity selector.
- Add-to-cart option.
- Product ratings and reviews.
- Related products.

A customer must not be able to purchase a product that is unavailable or inactive.

## 4.6 Seller Discovery

Customers must be able to discover nearby sellers.

Requirements:

- Display available sellers.
- Display shop name.
- Display shop image.
- Display seller rating where available.
- Display delivery estimate.
- Display delivery availability.
- Display available products.
- Display seller offers.

Seller discovery must respect the customer's selected delivery location.

## 4.7 Shopping Cart

Requirements:

- Add products to cart.
- Remove products.
- Increase quantity.
- Decrease quantity.
- View product prices.
- View seller-wise item grouping.
- View subtotal.
- View applicable discounts.
- View estimated delivery charges.
- View estimated total.
- Validate inventory and stock limits.
- Validate product status.
- Validate store operational availability.

### Single-Store Cart Model (MVP)

A customer can add products from only **one store** to their cart at a time. Every order belongs to exactly one store.

Products from different stores must NOT be combined into one cart or checkout.

#### Store-Switch Confirmation Rule
If a customer already has items in their cart from Store A and attempts to add an item from Store B:
1. The system must display a clear store-switch confirmation dialog:
   > *"Replace cart items? Your cart contains items from **[Store A]**. Do you want to discard your existing cart and add items from **[Store B]**?"*
2. If confirmed by the customer, the existing cart contents are cleared completely, and the new item from Store B is added.
3. If dismissed or cancelled, the existing cart remains untouched and no new item is added.

### Cart Validation

Before checkout:

- Validate store operating hours and operational status (store must be open).
- Validate product listing status (must be active and published).
- Validate stock availability in the store's inventory.
- Recalculate current store selling prices (never trust cached frontend prices).
- Validate minimum order value (MOV) compliance.
- Validate coupon eligibility against cart subtotal.
- Calculate distance-based delivery charges.
- Block checkout if any cart item is invalid, prompting the user with an actionable message.

The customer must be notified immediately if any prices, stock, or charges have changed since cart addition.

## 4.8 Wishlist

Requirements:

- Add product to wishlist.
- Remove product from wishlist.
- View saved products.
- Move available products to cart.

Wishlist functionality must be linked to the authenticated customer.

## 4.9 Customer Profile & Account Management (Phase 06)

Customers must be able to:

- View personal profile (name, email, verification status, avatar, date of birth, member since).
- Update name, avatar photo, and date of birth.
- Prevent unauthorized modifications to sensitive security fields (roles, account status, email verification).
- View account overview, status, creation date, and total saved addresses.
- Manage communication and alert preferences across Email, SMS, Push, and Promotional channels.
- Soft-deactivate their customer account with automatic revocation of active sessions.
- Enjoy an intentional mobile-first experience (>90% mobile audience) with persistent bottom navigation.
- Consistent customer-facing **Basket** terminology ("My Basket", "View Basket", "Your Basket is Empty").

## 4.10 Address Management (Phase 06)

Requirements:

- Add delivery address with category labels (`Home`, `Work`, `Other`).
- Edit delivery address with pre-filled inputs.
- Delete address with confirmation dialog.
- Enforce single default address invariant per customer.
- Automatically promote next available address to default if the default address is deleted.
- Save recipient name and 10-digit Indian delivery contact phone (`^[6-9]\d{9}$`).
- Save complete address lines, locality, and nearby landmark.
- Validate 6-digit Indian PIN code (`^\d{6}$`).
- Save latitude and longitude coordinates where available.
- Strict customer data isolation: server-side ownership derivation prevents IDOR vulnerabilities (cross-customer queries return 404).

The platform must validate whether the selected address is serviceable before checkout.

## 4.11 Order History

Customers must be able to:

- View previous orders.
- View order details.
- View seller-wise order information.
- View payment information.
- View delivery status.
- View cancellation status.
- View refund status.
- Reorder eligible products.

## 4.12 Ratings and Reviews

Requirements:

- Rate eligible products.
- Review purchased products.
- Rate sellers where supported.
- Display verified purchase indicators.
- Prevent duplicate reviews where policy prohibits them.
- Report inappropriate reviews.
- Allow administrator moderation.

---

# 5. SELLER MANAGEMENT REQUIREMENTS

Module ID: SELLER

## 5.1 Seller Registration & KYC Submission

The platform supports admin-verified seller onboarding for independent grocery stores and supermarkets.

Required registration information:
- Business & Shop Name (Store trade name).
- Owner Details (Full name, phone, email).
- Physical Shop Address (Address line, landmark, city, state, postal PIN code, and geographic coordinates).
- Permanent Account Number (PAN) of business / proprietor.
- Goods and Services Tax Identification Number (GSTIN) where legally applicable (with threshold/exemption declaration where exempt).
- Food Safety and Standards Authority of India (FSSAI) registration/license (mandatory for food and grocery sellers under Indian food safety regulations).
- Bank Account Details for settlements (Bank name, account number, IFSC code, account holder name, and verification proof such as cancelled cheque or bank statement).
- Supporting Business Documents (ID proof, address proof, trade license).

Security & Compliance:
- Document access and sensitive bank account details must be encrypted and restricted to authorized Super Admins.
- Unapproved sellers must not publish product listings or accept customer orders.

## 5.2 Seller Onboarding Lifecycle & Approval

Seller onboarding must strictly enforce the following administrative state machine:

```text
DRAFT ──> PENDING ──> UNDER_REVIEW ──┬──> APPROVED (Active) ──> SUSPENDED
                                     └──> REJECTED
```

- `DRAFT`: Seller has registered and is completing their profile and document uploads.
- `PENDING`: Seller has submitted application for admin review.
- `UNDER_REVIEW`: Admin is actively evaluating KYC documents and verifying store details.
- `APPROVED`: Admin has verified credentials and approved the seller; store is active and can publish listings.
- `REJECTED`: Application rejected with mandatory administrative reason; seller may correct and resubmit.
- `SUSPENDED`: Temporarily deactivated by Admin due to compliance, non-performance, or dispute issues. While suspended, listings are hidden and order placement is disabled.

Rules:
- Super Admin possesses final approval authority.
- Every state change, rejection reason, and approval action must be recorded in an immutable audit log.

## 5.3 Shop Management

Sellers must be able to:
- Manage store profile (shop banner, logo, display name, contact phone).
- Configure weekly business hours (opening time, closing time per day, and a manual emergency "Store Closed" toggle).
- Manage store delivery radius (e.g., 3–5 km) and serviceable PIN codes.
- View real-time operational status (Open / Closed / Busy).

## 5.4 Hybrid Product Catalog Management

The platform operates on an **Aggregator / Hybrid Marketplace Catalog Model**:
- Master Catalog Authority: The platform maintains the central product catalog (standardized brand, name, category, description, high-res images, barcode/EAN, and standard attributes).
- Store Listings: Approved sellers search the platform master catalog and create store-specific listings (`SellerProduct`).
- Store Controls: Each store independently manages:
  - Store Selling Price (Server-validated: MUST NOT exceed Maximum Retail Price - MRP).
  - Discount from MRP.
  - Initial and ongoing stock quantity.
  - Listing status (Active / Inactive / Out of Stock).
- New Product Requests: If an item is absent from the master catalog, sellers may submit a "Catalog Addition Request" to Super Admin with barcode, photos, and MRP. Once verified and approved by admin, it becomes part of the master catalog and available for all stores to list.

## 5.5 Inventory Management

Requirements:
- Store-specific inventory ledger tracking `availableQuantity` and `reservedQuantity`.
- Transaction-safe inventory reservation upon checkout initiation (10–15 min TTL).
- Real-time stock decrement upon confirmed payment.
- Automatic reservation release upon checkout failure or TTL expiry.
- Manual inventory adjustments (stock additions, damages, returns) recorded in `InventoryTransaction` ledger.
- Strict constraint: Available stock must never become negative.

## 5.6 Store Order Fulfillment

Sellers receive orders placed exclusively with their store.
Fulfillment steps:
1. Receive incoming order alert (`PENDING` / `CONFIRMED`).
2. Accept order within configured SLA (e.g. 5 minutes).
3. Pack order items, generate packing slip / invoice snapshot.
4. Mark order `PACKED` (`READY_FOR_PICKUP`). This locks the order against customer cancellation and triggers delivery partner dispatch.
5. Hand over packed parcel to the assigned delivery partner and verify rider handover.

## 5.7 Seller Reports

Seller dashboard reports should include:

- Total sales.
- Total orders.
- Completed orders.
- Cancelled orders.
- Product performance.
- Best-selling products.
- Commission deductions.
- Refund adjustments.
- Net earnings.
- Settlement history.

Seller reports must only include the seller's own records.

---

# 6. SUPER ADMIN REQUIREMENTS

Module ID: ADMIN

## 6.1 Admin Dashboard

The dashboard should display:

- Total customers.
- Total sellers.
- Active sellers.
- Pending seller applications.
- Total orders.
- Completed orders.
- Pending orders.
- Cancelled orders.
- Total transaction value.
- Platform revenue.
- Pending settlements.
- Refund statistics.

Analytics must distinguish order value, collected payments, refunds, commissions and actual platform revenue.

## 6.2 Customer Management

Admin must be able to:

- View customers.
- Search customers.
- Filter customers.
- View customer details.
- View customer orders.
- Activate accounts.
- Suspend accounts.
- Review reported accounts.

Administrative actions must be logged.

## 6.3 Seller Management

Admin must be able to:

- View sellers.
- Search sellers.
- Filter sellers.
- Review KYC.
- Approve sellers.
- Reject sellers.
- Suspend sellers.
- Reactivate sellers.
- View seller products.
- View seller orders.
- View seller earnings.
- View settlement history.

## 6.4 Product Management

Admin must be able to:

- View all product listings.
- Approve or reject listings where moderation is enabled.
- Edit categories.
- Deactivate products.
- Remove prohibited listings.
- Manage product visibility.
- Review reported products.

Seller ownership and listing history must be preserved.

## 6.5 Category Management

Requirements:

- Create categories.
- Edit categories.
- Delete categories when safe.
- Configure subcategories.
- Upload category images.
- Set display order.
- Activate/deactivate categories.

Existing products must not become orphaned through category deletion.

## 6.6 Order Management

Admin must be able to:

- View all customer orders.
- View seller-specific orders.
- Search orders.
- Filter orders.
- View payment status.
- View delivery status.
- Monitor fulfilment.
- Cancel eligible orders.
- Manage disputes.
- View refund information.

Administrative order changes must be audited.

## 6.7 Commission Management

Requirements:

- Configure platform commission.
- Configure seller-specific commission where enabled.
- Configure category-specific commission where enabled.
- View commission calculations.
- View commission history.
- View seller deductions.
- Generate commission reports.

Commission changes must not silently alter already finalized financial records.

## 6.8 Offers and Coupons

Admin must be able to:

- Create coupons.
- Edit coupons.
- Activate/deactivate coupons.
- Configure percentage discounts.
- Configure fixed discounts.
- Set minimum order amount.
- Set maximum discount.
- Set validity period.
- Configure usage limits.
- Configure customer eligibility.
- Configure seller or product eligibility where supported.

The system must validate coupon eligibility on the backend.

## 6.9 Banner Management

Admin must be able to:

- Upload promotional banners.
- Set banner title.
- Set banner description.
- Configure destination links.
- Set display order.
- Configure active dates.
- Activate/deactivate banners.

## 6.10 Reports and Analytics

The system must support reports for:

- Revenue.
- Orders.
- Customers.
- Sellers.
- Product performance.
- Commissions.
- Refunds.
- Settlements.
- Delivery performance.
- Payment transactions.

Reports should support relevant date filters and export functionality.

## 6.11 Administrative User Management

Super Admin must be able to manage administrative users.

Requirements:

- Create admin accounts.
- Assign roles.
- Configure permissions.
- Deactivate accounts.
- Review administrative activity.

The system must prevent unauthorized privilege escalation.

---

# 7. DELIVERY MANAGEMENT REQUIREMENTS

Module ID: DELIVERY

## 7.1 Delivery Model: Platform-Managed Delivery

The platform operates on a **Platform-Managed Delivery Model**:
- The platform retains full responsibility for delivery partner onboarding, order assignment, tracking, and customer communication.
- The delivery architecture must be designed behind a modular provider abstraction (`IDeliveryProvider` / `DeliveryService`) so that the platform can dispatch orders to either:
  1. Internal platform delivery partners (in-house rider fleet managed via the Delivery Partner interface).
  2. External 3PL hyperlocal delivery providers (e.g., Porter, Shadowfax) in future operational phases without refactoring core order logic.
- Live GPS streaming tracking is explicitly deferred from the MVP; the system tracks key milestone transitions with timestamps, rider name/phone, and status notes.

## 7.2 Delivery Partner Registration & Verification

Requirements:
- Partner registration via Phone Number + OTP.
- Identity & Verification documents (Aadhaar / Driving License, vehicle registration / RC).
- Admin approval required before receiving delivery assignments.
- Availability toggle (Online / Offline) in the partner interface.

## 7.3 Delivery Assignment & Dispatch Lifecycle

When an order is marked `PACKED` by the store, the system automatically creates a `Delivery` record and initiates assignment:

```text
PENDING_ASSIGNMENT ──> ASSIGNED ──> ACCEPTED ──> PICKED_UP ──> IN_TRANSIT ──┬──> DELIVERED
                            │            │                                   └──> FAILED (RTO)
                            └──REJECTED──┘
```

1. **Auto-Assignment:** System identifies nearby active, online delivery partners within the store's zone.
2. **Acceptance Window:** Partner has a configurable window (e.g. 60–90 seconds) to accept the assignment.
3. **Reassignment:** If rejected or timed out, the system reassigns to the next available partner. If no partners are available, alert is escalated to Super Admin dispatch dashboard.
4. **Pickup:** Delivery partner arrives at store, inspects parcel, verifies order number snapshot, and marks `PICKED_UP`.
5. **In Transit:** Partner navigates to customer address. Order status reflects `OUT_FOR_DELIVERY`.
6. **Delivery Confirmation:** Partner delivers to customer. For COD orders, partner collects exact cash, enters amount collected, and completes delivery with customer confirmation (e.g., Delivery OTP).
7. **Failed Delivery:** If customer is unreachable, address is incorrect, or customer refuses delivery, partner records failure with reason and photo proof. Order moves to `DELIVERY_FAILED`, package is returned to store (RTO), and inventory is reconciled.

## 7.4 Milestone Tracking & Notifications

Requirements:
- Real-time order tracking displays milestone progress to customer:
  - `Order Placed` -> `Store Preparing` -> `Packed & Ready` -> `Out for Delivery` (with Rider name & contact) -> `Delivered`.
- In-app and SMS status notifications triggered at each milestone.
- Proof of Delivery: Delivery timestamp, recipient confirmation, and optional delivery OTP.

## 7.5 Delivery Partner History & Payout Records

Delivery partners can view:
- Completed deliveries and trip summaries.
- Daily and weekly delivery earnings (fixed per-order payout + distance incentive).
- Cash collected on COD orders and required reconciliation balance with platform.
- Settlement status.

---

# 8. LOCATION AND SERVICEABILITY

Module ID: LOCATION

Location-based operations are essential to the quick-commerce model.

## 8.1 Customer Location

The platform must support:

- PIN code entry.
- Address selection.
- Location permission where available.
- Map-based address selection where enabled.
- Latitude and longitude storage.
- Manual address entry.

## 8.2 Seller Serviceability

The system must determine whether a seller can serve a customer address.

Potential criteria:

- Seller's registered location.
- Seller's delivery radius.
- PIN code.
- Configured delivery zones.
- Seller operating hours.
- Seller availability.

## 8.3 Product Serviceability

Products must only be available for purchase through eligible seller listings.

## 8.4 Delivery Estimates

The system should calculate estimated delivery times based on configurable factors:

- Seller preparation time.
- Distance.
- Delivery availability.
- Operating hours.
- Operational constraints.

The displayed delivery estimate must not be represented as a guaranteed delivery time unless the business explicitly approves such a commitment.

---

# 9. QUICK-COMMERCE REQUIREMENTS

Module ID: QUICK_COMMERCE

The platform must support:

1. Location-based seller discovery.
2. Location-based product availability.
3. Seller-specific inventory.
4. Seller-specific order fulfilment.
5. Estimated delivery time.
6. Delivery charge calculation.
7. PIN-code-based serviceability.
8. Multiple sellers within the same service area.
9. Independent seller order processing.
10. Delivery partner assignment.
11. Order status notifications.
12. Configurable delivery operations.

The initial business target is to support delivery operations within approximately 10–30 minutes where operationally feasible.

The system must remain configurable as delivery operations expand.

---

# 10. SINGLE-STORE CART AND CHECKOUT

Module ID: CHECKOUT

## 10.1 Cart Structure & Single-Store Enforcement

In accordance with the finalized MVP baseline, Marvel's Basket strictly implements **Single-Seller / Single-Store Cart and Checkout**:

- A customer cart belongs to a single authenticated customer and is bound to a single store (`sellerId`).
- All items in the cart must belong to the active store's listings (`SellerProduct`).
- Items from different stores cannot be combined into one cart or checkout.
- If a customer attempts to add an item from Store B while their cart contains items from Store A, the UI presents a mandatory confirmation modal explaining that the existing cart will be cleared.
- Upon confirmation, the cart is purged and the new store's item is added.

## 10.2 Server-Side Checkout Validation

When the customer initiates checkout, the backend must execute an atomic validation pipeline:
1. Customer Authentication: Verify authenticated customer session.
2. Store Operational Status: Verify the selected store is currently `APPROVED`, active, open for business, and within daily operating hours.
3. Delivery Serviceability: Verify customer delivery address coordinates and postal PIN code fall within the store's configured delivery radius and service zone.
4. Product & Pricing Validation:
   - Verify all products in the cart are active and not archived.
   - Recalculate prices from the database. Frontend-provided prices must never be accepted.
   - Enforce that store selling price does not exceed product MRP.
5. Inventory Availability: Check that each item's requested quantity is less than or equal to current `availableQuantity`.
6. Minimum Order Value (MOV): Verify cart subtotal satisfies the store's or platform's configured MOV.
7. Promotional Validation: Verify coupon code validity, usage limits, minimum spend, and calculate platform-funded discount.
8. Delivery Fee Calculation: Calculate distance-tiered delivery fee based on store-to-customer distance.

## 10.3 Atomic Inventory Reservation

To prevent race conditions and overselling:
- When the customer clicks "Proceed to Payment", the backend executes an atomic database transaction that decrements `availableQuantity` and increments `reservedQuantity` in the store's inventory.
- A `StockReservation` record is created with an explicit Time-To-Live (TTL) of 10–15 minutes.
- If payment succeeds, the reservation is marked `COMMITTED` and stock is permanently deducted.
- If payment fails, is aborted, or the TTL expires, a scheduled BullMQ background worker marks the reservation `RELEASED` and restores the inventory.

## 10.4 Order Creation & Immutability

Upon successful checkout validation, a single `Order` record is created directly for the store:
- Associated with `customerId`, `sellerId`, and `storeId`.
- Preserves an immutable JSON snapshot of the delivery address.
- Creates `OrderItem` records containing immutable snapshots of product name, variant, SKU, unit price, MRP, quantity, and item total.
- Records subtotal, delivery fee, coupon discount, tax, and final payable amount.
- Multi-seller parent/sub-orders are explicitly excluded from the MVP.

---

# 11. ORDER MANAGEMENT

Module ID: ORDER

## 11.1 Single-Store Order Structure

Every order placed on Marvel's Basket belongs to exactly one store:

| Field | Description |
|---|---|
| `orderNumber` | Human-readable unique identifier (e.g., `MB-2026-XXXXX`) |
| `customerId` | References the ordering customer |
| `sellerId` | References the fulfilling store / seller |
| `addressSnapshot` | Frozen recipient name, phone, address, coordinates, and delivery instructions |
| `subtotal` | Sum of item totals at store selling price |
| `deliveryFee` | Calculated platform-managed delivery charge |
| `discountAmount` | Applied promotional discount |
| `totalAmount` | Final payable total (`subtotal + deliveryFee - discountAmount`) |
| `status` | Current operational order status |
| `paymentStatus` | Current financial transaction status |
| `deliveryStatus` | Current dispatch and delivery progress status |

## 11.2 Order Lifecycle & State Machine

The order lifecycle strictly separates operational fulfillment from payment and delivery:

```text
PENDING ──> CONFIRMED ──> PACKED ──> OUT_FOR_DELIVERY ──> DELIVERED
   │            │           │                                  │
   ├──FAILED    └──CANCELLED└──(Admin only)                    └──RETURN_REQUESTED
   └──REJECTED                                                        │
                                                                      ├──COMPLAINT_APPROVED (Refund)
                                                                      └──COMPLAINT_REJECTED
```

- `PENDING`: Order created, awaiting online payment confirmation or COD verification.
- `CONFIRMED`: Payment verified or COD confirmed. Store receives new order alert.
- `PACKED` (`READY_FOR_PICKUP`): Store has prepared and packed the parcel. Order is locked against customer cancellation. Delivery partner assignment begins.
- `OUT_FOR_DELIVERY`: Delivery partner has collected the order and is en route.
- `DELIVERED`: Parcel delivered to customer, confirmed by OTP or rider confirmation.
- `CANCELLED`: Order cancelled by customer (pre-packing) or admin.
- `REJECTED`: Store rejected order within acceptance window (e.g. unexpected stock damage). Triggers auto-refund.
- `FAILED`: Payment failed or checkout expired.

## 11.3 Cancellation Policy by Order State

Permissions and rules governing order cancellation:
- Pre-Packing (`PENDING`, `CONFIRMED`): Customer has unconditional free cancellation rights directly from the web interface. Full source refund is initiated immediately for online payments; reserved stock is released.
- Post-Packing (`PACKED`): Customer self-service cancellation is disabled. Store has expended labor and packing materials. Cancellation requires contacting customer support; permitted only under exceptional circumstances.
- In Transit (`OUT_FOR_DELIVERY`): Cancellation is strictly prohibited. Customer must accept delivery or raise a delivery dispute.
- Store Cancellation / Rejection: Permitted only before packing with a mandatory reason. Triggers immediate customer notification, full refund, and administrative monitoring for merchant non-performance.

## 11.4 Customer Complaints & Return Windows

Grocery products cannot support traditional non-food e-commerce returns. The platform implements a structured complaint and refund workflow:
- Perishable Items (Fruits, Vegetables, Dairy, Bakery): Complaints (damaged, spoiled, missing) must be lodged within 3–4 hours of delivery with mandatory clear photo evidence.
- Packaged Non-Perishables (Staples, Canned goods, Personal care): Complaints (expired, damaged seal, wrong item) must be lodged within 24–48 hours of delivery with photo evidence.
- Resolution: Admins evaluate evidence and issue full or partial source refunds. No reverse physical pickup is conducted for perishable items.

---

# 12. PAYMENT REQUIREMENTS

Module ID: PAYMENT

## 12.1 Supported Payment Methods

The platform supports the following payment methods:
- Unified Payments Interface (UPI): Instant mobile payment via Google Pay, PhonePe, Paytm, BHIM, and UPI Intent.
- Debit & Credit Cards: Visa, MasterCard, RuPay, and American Express.
- Net Banking: Major Indian retail and corporate banking institutions.
- Cash on Delivery (COD): Available subject to strict configurable risk rules.

## 12.2 Payment Gateway Provider: Razorpay

Razorpay is evaluated and selected as the primary payment gateway provider behind a modular interface (`IPaymentService`):
- Features utilized: Razorpay Orders API, Payment Verification, Webhook Notifications, and Refunds API.
- Modular Provider Abstraction: Payment gateway logic must reside strictly behind an interface so another provider (e.g. Cashfree, PhonePe PG) can be integrated without modifying order business logic.
- Commercial & Route Dependencies:
  - Do NOT assume Razorpay Route (marketplace split settlement) is automatically available, eligible, or active.
  - Razorpay standard gateway will collect payments centrally into Marvel's Basket nodal/escrow account.
  - Seller payouts will be calculated internally and disbursed through standard bank payout mechanisms / batch transfers until Route compliance is formally contracted.

## 12.3 Payment Workflow & Verification Security

1. Customer reaches checkout and confirms the order amount.
2. Backend creates an internal `Payment` record and requests a `razorpay_order_id` via the Razorpay Orders API with the exact atomic amount.
3. Customer completes the transaction in the Razorpay checkout modal.
4. **Strict Security Rule:** An online payment must NEVER be marked as successful based on a frontend client response alone.
5. Server Verification: Backend verifies the cryptographic HMAC-SHA256 signature (`razorpay_order_id` + `|` + `razorpay_payment_id` against `RAZORPAY_KEY_SECRET`).
6. Webhook Idempotency: Verified Razorpay webhooks (`order.paid`, `payment.failed`, `refund.processed`) are verified against the raw request body using `RAZORPAY_WEBHOOK_SECRET`. Webhook event IDs are stored in `PaymentWebhookEvent` to guarantee idempotent processing and prevent duplicate ledger updates.
7. Separation of Concerns: `PaymentStatus` and `OrderStatus` remain strictly decoupled.

## 12.4 Cash on Delivery (COD) Governance

COD carries inherent cash handling and Return-To-Origin (RTO) risks:
- Configurable Order Limits: Maximum order value capped (proposed baseline: ₹1,500; configurable in admin settings). Minimum order value applies.
- Location Eligibility: COD can be disabled for specific high-risk PIN codes.
- Customer Eligibility: Customers with 2 or more consecutive RTO/refused deliveries will have COD automatically disabled.
- Cash Collection: Delivery partner collects cash upon delivery, records collected amount in the delivery partner interface, and platform reconciles cash collection against rider account balances.

## 12.5 Refund Processing & Policies

- Source Refunds: Refunds for online payments are issued directly to the original payment source (bank account / UPI / card via Razorpay Refunds API).
- Processing Window: 5–7 business days depending on customer's issuing bank.
- Partial Refunds: Fully supported (e.g., when 1 of 5 items is damaged or out of stock).
- COD Refunds: For approved COD complaints, refunds are issued via direct bank transfer / UPI payout upon admin authorization.
- Customer Wallet: Stored-value internal wallet/credit is explicitly excluded from the MVP.

---

# 13. COMMISSION AND FINANCIAL SETTLEMENT REQUIREMENTS

Module ID: FINANCE

## 13.1 Commission Architecture

The platform operates on a **Category-Based Commission Model**:
- Commission percentages are configurable by product category in Super Admin settings (proposed baseline range: 10%–18%).
- Commission percentages must NEVER be hardcoded in application logic.
- Commission Calculation Base: Commission is calculated strictly on the net store item selling price (`quantity * sellingPrice`) of delivered items. Delivery fees and regulatory taxes do not form part of the commission base.

## 13.2 Financial Allocation & Responsibility Matrix

To maintain financial integrity and clear auditability, cost responsibilities are explicitly defined:

| Financial Element | Bearer / Allocation Rule |
|---|---|
| Platform Commission | Deducted by Marvel's Basket from seller gross sales |
| Payment Gateway Fees (~2%) | Borne by platform operations (absorbed from commission) |
| Platform Coupon Discounts | Funded 100% by Marvel's Basket; seller receives full item selling price |
| Store-Level Discounts (< MRP) | Funded 100% by the seller (reflected in lower item price) |
| Delivery Charges | Paid by customer to fund platform delivery fleet operations |
| Merchant Product Quality Refunds | Deducted 100% from seller earnings |
| Transit Damage / RTO Loss | Borne by platform operations / delivery provider |

## 13.3 Settlement Cycle & Payout Workflow

- Proposed Settlement Cycle: T+3 business days following verified order delivery (`DELIVERED` status).
- The settlement cycle must remain configurable in platform settings.
- Payout Holds: Order earnings are placed on hold if:
  1. An open customer complaint or dispute is active on the order.
  2. The seller's bank details or KYC verification are incomplete or suspended.
  3. The seller's cumulative ledger balance is negative due to refunds or penalty deductions.
- Auditable Ledger Entries: Every financial event creates an immutable, append-only `SellerLedgerEntry` recording debit/credit, transaction type, reference order ID, and updated balance.
- Settlement Batches: Payouts are aggregated into `Settlement` batches with UTR/bank reference numbers recorded upon completion. Mutable order totals must never be used to recalculate historical settlements.

- Financial amounts must use precise decimal arithmetic.
- Completed transactions must not be silently modified.
- Refunds must be recorded separately.
- Commission calculations must be reproducible.
- Financial changes must be auditable.

---

# 14. NOTIFICATION REQUIREMENTS

Module ID: NOTIFICATION

The system must support notifications for relevant user actions.

## 14.1 Customer Notifications

- Registration.
- Account verification.
- Order confirmation.
- Payment success.
- Payment failure.
- Seller acceptance.
- Order preparation.
- Out for delivery.
- Order delivered.
- Order cancellation.
- Refund updates.
- Promotional offers where permitted.

## 14.2 Seller Notifications

- New order.
- Order cancellation.
- Order rejection.
- Payment-related updates.
- KYC status changes.
- Settlement updates.
- Platform announcements.

## 14.3 Delivery Partner Notifications

- New assignment.
- Assignment cancellation.
- Pickup instructions.
- Delivery instructions.
- Delivery updates.

## 14.4 Admin Notifications

- New seller registration.
- Pending KYC applications.
- Important order issues.
- Payment failures.
- Refund requests.
- Delivery exceptions.
- Platform alerts.

## 14.5 Notification Channels

Proposed channels:

- In-app notifications.
- Email.
- SMS.
- Push notifications in future applications.

WhatsApp notifications are not included in the initial confirmed scope.

---

# 15. SECURITY REQUIREMENTS

Module ID: SECURITY

The platform must satisfy the following security requirements.

| ID | Requirement |
|---|---|
| SEC-001 | All production communication must use HTTPS. |
| SEC-002 | Passwords must be securely hashed. |
| SEC-003 | Role-based authorization must be enforced by the backend. |
| SEC-004 | Seller data must be isolated. |
| SEC-005 | Customers must only access their own private records. |
| SEC-006 | Sensitive configuration must be stored in environment variables or a secrets manager. |
| SEC-007 | Input validation must be implemented on API boundaries. |
| SEC-008 | Rate limiting must protect sensitive endpoints. |
| SEC-009 | Payment webhooks must be verified. |
| SEC-010 | Webhook processing must be idempotent. |
| SEC-011 | Administrative actions must be logged. |
| SEC-012 | File uploads must be validated. |
| SEC-013 | Sensitive information must not be exposed in application logs. |
| SEC-014 | Database access must use appropriate permissions. |
| SEC-015 | Production backups must be maintained. |

---

# 16. NON-FUNCTIONAL REQUIREMENTS

## 16.1 Performance

- Homepage should load efficiently.
- Product listing must support pagination.
- Product search must be optimized.
- Database queries must use appropriate indexes.
- APIs must avoid unnecessary database queries.
- Images must be optimized.
- Heavy operations must be handled asynchronously where appropriate.
- Checkout must remain reliable under concurrent usage.

Initial engineering targets, subject to infrastructure and load-test validation:

| Metric | Target |
|---|---|
| Standard API response | p95 ≤ 500 ms |
| Product listing API | p95 ≤ 700 ms |
| Search API | p95 ≤ 800 ms |
| Initial page loading | Optimize toward LCP ≤ 2.5 seconds |
| Checkout processing | Target ≤ 3 seconds excluding external gateway delays |

These are engineering targets, not guaranteed service-level agreements.

## 16.2 Scalability

The architecture must support:

- Increasing customer registrations.
- Increasing seller registrations.
- Large product catalogs.
- Concurrent orders.
- Increasing inventory updates.
- Multiple delivery areas.
- Future mobile applications.

The initial implementation will use a modular monolith architecture.

## 16.3 Availability and Reliability

- Production services must be monitored.
- Database backups must be configured.
- Failed operations must be logged.
- Payment failures must be handled safely.
- Order processing must preserve consistency.
- Recovery procedures must be documented.

## 16.4 Maintainability

- Strict TypeScript configuration.
- Modular code structure.
- Reusable components.
- Documented API contracts.
- Controlled database migrations.
- Consistent error handling.
- Automated testing.

## 16.5 Responsiveness

The customer website and dashboards must support:

- Desktop.
- Laptop.
- Tablet.
- Mobile devices.

Mobile-first design must be followed for customer-facing interfaces.

## 16.6 Accessibility

The platform should follow WCAG 2.2 AA principles where practicable.

Requirements include:

- Keyboard navigation.
- Accessible labels.
- Sufficient contrast.
- Meaningful error messages.
- Accessible form validation.
- Appropriate semantic HTML.

## 16.7 Browser Compatibility

Support current stable versions of:

- Google Chrome.
- Safari.
- Mozilla Firefox.
- Microsoft Edge.

## 16.8 Data Integrity

- Foreign key relationships must be enforced.
- Inventory updates must be transaction-safe.
- Payment processing must be idempotent.
- Order records must preserve historical snapshots.
- Financial records must remain auditable.

---

# 17. BUSINESS RULES

The following rules govern core marketplace behaviour.

## BR-001: Seller Approval
Only approved and active sellers (`status = APPROVED`) can list products, set prices, maintain stock, and receive orders.

## BR-002: Seller Isolation
Sellers can only manage and view their own shop, listings, inventory, orders, and financial ledger. Cross-tenant access is strictly blocked at the backend.

## BR-003: Inventory Ownership
Every store listing maintains its own inventory. The same catalog product listed by multiple stores maintains independent stock records per store.

## BR-004: Product Availability
A product is purchasable only when its catalog status is active, the store listing is active, the store is currently open, and sufficient stock is available.

## BR-005: Single-Store Cart (MVP)
A customer cart may only contain products from one store at a time. Attempting to add an item from another store prompts a clear store-switch confirmation dialog that clears the existing cart upon approval.

## BR-006: Single-Store Order Fulfillment (MVP)
Every customer order belongs to exactly one store. Multi-seller parent/child split orders are excluded from the MVP.

## BR-007: Inventory Validation & Reservation
Stock must be revalidated and atomically reserved for 10–15 minutes at checkout initiation. Unpaid or expired reservations are automatically released.

## BR-008: Price & MRP Validation
The backend determines final payable amounts. Frontend-provided prices must never be trusted. Store selling price must never exceed the product Maximum Retail Price (MRP).

## BR-009: Server-Side Payment Verification
An order must never be marked paid based solely on a frontend success callback. Payment is confirmed only via cryptographic server-side signature verification and verified webhooks.

## BR-010: Refund Integrity & Source Refunds
Refunds must reference the original payment transaction. Refunds are credited directly to the original payment source (5–7 business days). Customer wallet is excluded from the MVP.

## BR-011: Commission Integrity
Platform commission is category-based and calculated strictly on the net store item price of delivered items. Commission rules must be preserved immutably with the order.

## BR-012: Hyperlocal Serviceability
Customers can only place orders for stores whose configured delivery radius and service area cover the customer's delivery coordinates and PIN code.

## BR-013: Cancellation State Boundaries
Customer cancellation is unconditionally free before the order status reaches `PACKED`. Once `PACKED`, cancellation requires administrative intervention. Once `OUT_FOR_DELIVERY`, cancellation is strictly prohibited.

## BR-014: Platform-Managed Delivery Assignment
Delivery assignment is managed exclusively by the platform. Orders marked `PACKED` are automatically dispatched to eligible delivery partners or modular external providers.

## BR-015: Delivery Completion & Proof
A delivery is completed only when the delivery partner records customer handover confirmation (e.g., delivery OTP or verified cash collection for COD).

## BR-016: Account Suspension Enforcement
Suspended users and merchants cannot perform restricted marketplace operations. Listings of suspended sellers are immediately hidden from customer discovery.

## BR-017: Administrative & Financial Auditability
All sensitive administrative actions (KYC approvals, commission changes, refunds, cancellations, and settlements) must produce immutable audit log entries.

## BR-018: Historical Record Immutability
Deactivation or deletion of a user, seller, or catalog product must never mutate historical order, payment, and financial ledger snapshots.

## BR-019: Coupon Validation
Platform coupons must be validated server-side against cart value, expiration date, per-user limits, and overall usage limits.

## BR-020: Order Snapshots
Orders must preserve product names, variants, SKUs, unit prices, MRPs, delivery addresses, and applied discounts as immutable snapshots at order creation time.

## BR-021: COD Risk Controls
COD orders are capped at a configurable threshold (baseline: ₹1,500), restricted to serviceable PIN codes, and automatically disabled for customers with repeated RTO rejections.

## BR-022: Settlement Payout Holds
Seller payouts follow a T+3 business day settlement cycle post-delivery. Payouts are automatically held for active customer complaints, incomplete KYC, or negative ledger balances.

---

# 18. EDGE CASES AND EXCEPTION HANDLING

The platform must explicitly handle the following operational edge cases:

## 18.1 Inventory & Checkout
- Simultaneous Checkout: Two customers attempt to buy the final item simultaneously; atomic database reservation ensures the first commits and the second receives a clear "Item out of stock" message.
- Stock Modification during Checkout: Seller updates inventory while a customer is in checkout; checkout revalidation blocks transaction and informs customer.
- Checkout Abandonment: Customer closes browser during payment; BullMQ worker automatically expires the reservation after TTL (15 min) and restores available stock.

## 18.2 Store Order Exceptions
- Store Rejection: Store is unable to fulfill (e.g. inventory damaged); store rejects order within acceptance window, customer is notified immediately, and 100% full source refund is initiated.
- Partial Out-of-Stock before Packing: Store discovers an item is missing; store/admin coordinates with customer. If partial fulfillment is accepted, order total is adjusted and partial refund issued. If rejected, entire order is cancelled.
- Store Delays: Store fails to mark order `PACKED` within SLA; administrative alert triggers manual intervention or automatic cancellation.

## 18.3 Payments & Webhooks
- Browser Closes Post-Payment: Razorpay server-to-server webhook `order.paid` arrives independently, confirms order, and initiates fulfillment without requiring frontend callback.
- Duplicate Webhooks: Razorpay re-transmits webhook; system checks `PaymentWebhookEvent` table, detects existing event ID, returns HTTP 200, and skips duplicate processing.
- Payment Delayed / Interrupted: Payment order remains `PENDING` until webhook confirmation or timeout.

## 18.4 Delivery & Transit
- Rider Rejection / Timeout: Delivery partner rejects or ignores assignment within 90 seconds; system auto-reassigns to the next nearest available rider.
- Customer Unreachable at Doorstep: Rider waits required grace period (e.g. 10 minutes), attempts phone contact; if unreachable, marks `DELIVERY_FAILED`, package is returned to store (RTO), and admin reviews resolution.
- Transit Damage: Parcel damaged during delivery; rider records damage, customer is refunded, and platform absorbs delivery loss.

## 18.5 Authentication & OTP
- OTP Flooding: Customer spams "Resend OTP"; rate limiter enforces 60-second cooldown and caps requests at 5 per hour.
- Brute Force OTP Guessing: Attacker attempts guessing OTP; account enters temporary 15-minute lock after 5 consecutive failures.
- Token Expiry during Session: Access token expires (15 min); frontend transparently exchanges rotating refresh token via HttpOnly cookie without interrupting user.

All exceptions must produce understandable user messages and maintain data consistency.

---

# 19. API REQUIREMENTS

The backend will expose versioned REST APIs.

Base path:

`/api/v1`

Major API groups:

| API Group | Responsibility |
|---|---|
| /auth | Authentication |
| /users | User management |
| /customers | Customer operations |
| /sellers | Seller management |
| /products | Product catalog |
| /categories | Category management |
| /inventory | Inventory operations |
| /cart | Shopping cart |
| /checkout | Checkout |
| /orders | Order management |
| /payments | Payment operations |
| /refunds | Refund operations |
| /commissions | Commission management |
| /settlements | Seller settlements |
| /deliveries | Delivery management |
| /locations | Serviceability and locations |
| /reviews | Ratings and reviews |
| /offers | Coupons and promotions |
| /notifications | Notifications |
| /admin | Administrative operations |
| /reports | Reporting and analytics |

API requirements:

- Consistent response format.
- Consistent error format.
- Request validation.
- Pagination.
- Filtering.
- Sorting.
- Authentication.
- Authorization.
- API documentation.
- Appropriate HTTP status codes.
- Rate limiting.
- Structured logging.

Swagger/OpenAPI documentation is recommended.

---

# 20. TESTING REQUIREMENTS

## 20.1 Unit Testing

Test individual services, utilities and business logic.

## 20.2 Integration Testing

Test:

- Database operations.
- API endpoints.
- Authentication.
- Authorization.
- Seller isolation.
- Order creation.
- Inventory transactions.
- Payment processing.
- Refund workflows.

## 20.3 End-to-End Testing

Test complete user workflows:

1. Customer registration and login.
2. Seller registration and approval.
3. Product creation.
4. Inventory management.
5. Product browsing.
6. Multi-vendor cart.
7. Checkout.
8. Payment.
9. Seller fulfilment.
10. Delivery assignment.
11. Order completion.
12. Refund and cancellation.

## 20.4 Security Testing

- Authentication bypass.
- Authorization bypass.
- IDOR vulnerabilities.
- SQL injection.
- XSS.
- CSRF where applicable.
- Rate limiting.
- File upload validation.
- Payment manipulation.
- Webhook replay attacks.
- Seller data leakage.

## 20.5 Performance Testing

- Concurrent users.
- Product browsing.
- Search.
- Checkout.
- Concurrent inventory updates.
- Order creation.
- Reporting queries.

## 20.6 Responsive Testing

All primary interfaces must be tested across supported screen sizes and browsers.

---

# 21. ACCEPTANCE CRITERIA

The project will be considered functionally ready for production review when the following criteria are satisfied.

## Customer Website

- [ ] Customers can register and log in.
- [ ] Customers can manage their profiles.
- [ ] Customers can manage delivery addresses.
- [ ] Customers can browse categories and products.
- [ ] Customers can search and filter products.
- [ ] Customers can discover serviceable sellers.
- [ ] Customers can add products from multiple sellers to cart.
- [ ] Customers can complete checkout.
- [ ] Customers can make supported payments.
- [ ] Customers can view and track orders.
- [ ] Customers can view order history.
- [ ] Customers can submit eligible reviews.

## Seller Dashboard

- [ ] Sellers can register.
- [ ] Sellers can submit KYC information.
- [ ] Admin can approve or reject sellers.
- [ ] Sellers can manage shop profiles.
- [ ] Sellers can manage products.
- [ ] Sellers can manage inventory.
- [ ] Sellers can process orders.
- [ ] Sellers can view sales reports.
- [ ] Sellers can view commissions and earnings.

## Super Admin Dashboard

- [ ] Admin can manage customers.
- [ ] Admin can manage sellers.
- [ ] Admin can manage products and categories.
- [ ] Admin can manage orders.
- [ ] Admin can configure commissions.
- [ ] Admin can manage coupons and banners.
- [ ] Admin can manage refunds.
- [ ] Admin can view reports.
- [ ] Admin can manage administrative users.
- [ ] Admin can review audit logs.

## Delivery Partner Interface

- [ ] Delivery partners can register or be onboarded.
- [ ] Admin can approve delivery partners.
- [ ] Delivery partners can view assignments.
- [ ] Delivery partners can accept eligible assignments.
- [ ] Delivery partners can update delivery status.
- [ ] Customers can view relevant delivery updates.
- [ ] Delivery history and earnings are available.

## Backend and Infrastructure

- [ ] All APIs follow the approved architecture.
- [ ] Database relationships are validated.
- [ ] Authentication and authorization are enforced.
- [ ] Seller data isolation is verified.
- [ ] Inventory operations are transaction-safe.
- [ ] Payment verification works correctly.
- [ ] Webhook idempotency is tested.
- [ ] Refund workflows are tested.
- [ ] Automated tests pass.
- [ ] Security audit is completed.
- [ ] Backup and recovery procedures are verified.
- [ ] Production deployment is tested.

---

# 22. OUT OF SCOPE FOR MVP RELEASE

The following features and architectures are explicitly excluded from the MVP scope:

1. Multi-Seller Combined Cart & Checkout (parent orders and seller sub-orders).
2. Customer Stored-Value Wallet / Internal Credit System (avoids RBI PPI regulatory compliance in MVP).
3. Live GPS Continuous Streaming / Geolocation Tracking of Delivery Riders (milestone status tracking used instead).
4. Automated Instant Marketplace Split Settlements (e.g. Razorpay Route before operational eligibility confirmation).
5. Native Android & iOS mobile applications (responsive Next.js web application serves mobile web).
6. Dedicated Seller and Delivery Partner Native Mobile Apps.
7. AI-based Personalized Recommendation Engines.
8. Machine-learning-based Demand Forecasting & Automated Dynamic Pricing.
9. Direct Platform-Owned Dark Store Warehouses (pure third-party seller marketplace for MVP).
10. Automated Route Optimization for multi-stop delivery routes.
11. WhatsApp Business Automated Conversational Commerce.
12. Customer Paid Subscription Memberships (e.g. VIP free delivery pass).
13. Loyalty Points and Reward Tiering Programs.
14. International Marketplace Operations and Multi-Currency Transactions.
15. Doorstep Open-Box Physical Return Pickups for perishable goods.

---

# 23. ASSUMPTIONS AND DEPENDENCIES

The following dependencies and assumptions apply to the Phase 00 baseline:

1. Brand Assets & Guidelines: Marvel's Basket will provide final logo SVGs and banner image photography.
2. Product Master Catalog Seed: Initial catalog of categories, FMCG products, and grocery metadata must be curated.
3. Seller Verification Documents: Business PAN, GSTIN declaration, and FSSAI license numbers must be validated by admin.
4. Commission & Settlement Rates: Category commission percentages (10%–18% baseline) and payout schedules (T+3 baseline) require final owner sign-off.
5. Razorpay Account & Commercials: Account activation, API credentials, and webhook secrets for UPI, Cards, Netbanking.
6. SMS Provider Gateway: Fast2SMS, MSG91, or Twilio integration for customer Phone OTP delivery.
7. Google Maps Platform: API Key with Geocoding, Places, and Distance Matrix APIs enabled for location serviceability.
8. Hosting Infrastructure: Containerized deployment on Render/AWS/Railway with managed PostgreSQL and Redis.
9. Legal Policies: Terms of Service, Privacy Policy (DPDP Act 2023 compliant), and Refund/Cancellation Policy drafted and approved.

---

# 24. REQUIREMENT PRIORITY

| Priority | Meaning | Scope Included |
|---|---|---|
| P0 - Critical | Mandatory for MVP Launch | Customer Phone OTP, Seller Onboarding & KYC, Master Catalog & Store Listings, Store Inventory, Single-Store Cart & Checkout, Atomic Reservation, Single-Store Orders, Razorpay (UPI/Cards/Netbanking) + COD, Platform-Managed Delivery Milestones, Category Commission & Ledger, Admin Approvals & Audit Logs, Security & Docker Deployment |
| P1 - High | Operational Marketplace Completeness | Store Operating Hours validation, Distance-tiered delivery fee calculation, Platform Coupons, Customer Photo Complaints & Source Refunds, Delivery Partner Payout Ledger, Admin Sales & Settlement Reports, Email/SMS event notifications |
| P2 - Future | Post-MVP Roadmap | Multi-seller combined cart & checkout, Customer Stored-Value Wallet, Live GPS continuous tracking, Razorpay Route automated splits, Native iOS/Android mobile apps, Dark store management |
- Automated notifications.

### P2 - Future

- Native applications.
- AI recommendations.
- Loyalty programmes.
- Advanced analytics.
- Route optimization.
- Automated marketplace payouts.
- Marketing automation.

Final prioritization must be confirmed during project planning.

---

# 25. REQUIREMENTS CHANGE MANAGEMENT

Any change to the approved requirements must follow a controlled process.

1. Record the requested change.
2. Identify the affected modules.
3. Evaluate technical impact.
4. Evaluate database impact.
5. Evaluate security impact.
6. Evaluate additional development effort.
7. Evaluate timeline and commercial impact.
8. Obtain stakeholder approval.
9. Update the relevant documentation.
10. Implement and test the approved change.

No major scope change should be silently introduced into the project.

---

# 26. DOCUMENT MAINTENANCE

This document must be updated whenever approved functional or non-functional requirements change.

Related documents:

- PROJECT_CONTEXT.md
- TECHNICAL_ARCHITECTURE.md
- DATABASE_SCHEMA.md
- PROJECT_STATUS.md
- PROJECT_DECISIONS.md
- IMPLEMENTATION_PHASES.md

Requirements must remain consistent across all project documentation and actual implementation.

---

# END OF PROJECT_REQUIREMENTS.md

**Project:** Marvel's Basket  
**Project ID:** MB/MT/2026/001  
**Prepared By:** Marvel's Techworks  
**Document:** PROJECT_REQUIREMENTS.md  
**Version:** 1.0  
**Status:** Initial Requirements Draft