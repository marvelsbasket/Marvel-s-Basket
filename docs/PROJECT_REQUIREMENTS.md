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

The current development scope includes:

1. Customer Website.
2. Multi-Vendor Seller Dashboard.
3. Super Admin Dashboard.
4. Delivery Partner Dashboard.
5. NestJS REST API.
6. PostgreSQL Database.
7. Prisma ORM Integration.
8. Payment Gateway Integration.
9. Location-Based Seller Discovery.
10. Multi-Vendor Order Management.
11. Delivery Management.
12. Testing and Quality Assurance.
13. Production Deployment.
14. Technical Documentation and Handover.

Native mobile applications are reserved for future development unless separately approved.

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

## 3.1 Registration

The system must support customer registration.

Requirements:

- Registration using name, email and mobile number.
- Secure password creation.
- Email and/or mobile verification according to configured authentication policy.
- Duplicate account prevention.
- Terms and privacy policy acceptance.
- Account activation after required verification.

Seller registration must follow a separate onboarding workflow.

## 3.2 Login

The system must support:

- Customer login.
- Seller login.
- Admin login.
- Delivery partner login.

Requirements:

- Secure authentication.
- Password verification.
- Session/token management.
- Account status validation.
- Role-based redirection.
- Secure logout.
- Protection against brute-force attempts.

## 3.3 Password Management

- Forgot password.
- Password reset through a verified channel.
- Password change from account settings.
- Password strength validation.
- Secure password hashing.
- Invalidation of relevant sessions after security-sensitive changes.

## 3.4 Authorization

The system must implement Role-Based Access Control (RBAC).

A user must not gain permissions by changing frontend URLs, request payloads or API parameters.

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
- Validate inventory.
- Validate product status.
- Validate seller availability.

### Multi-Vendor Cart

A single customer cart must support products from multiple sellers.

The cart must maintain seller-specific product groupings.

Example:

| Seller | Products | Amount |
|---|---|---:|
| Seller A | Rice, Milk | ₹350 |
| Seller B | Fruits | ₹150 |
| Seller C | Snacks | ₹100 |
| Total | | ₹600 |

The checkout process must create independent seller fulfilment records under one customer-facing order.

### Cart Validation

Before checkout:

- Validate product availability.
- Validate seller status.
- Validate stock.
- Recalculate current product prices.
- Validate coupon eligibility.
- Recalculate delivery charges.
- Prevent checkout with invalid cart items.

The customer must be informed when cart contents change.

## 4.8 Wishlist

Requirements:

- Add product to wishlist.
- Remove product from wishlist.
- View saved products.
- Move available products to cart.

Wishlist functionality must be linked to the authenticated customer.

## 4.9 Customer Profile

Customers must be able to:

- View profile.
- Update name.
- Update email where permitted.
- Update mobile number through verification.
- Change password.
- Manage saved addresses.
- View order history.
- View account status.

## 4.10 Address Management

Requirements:

- Add delivery address.
- Edit delivery address.
- Delete address.
- Set default address.
- Save recipient name and phone.
- Save complete address.
- Save landmark.
- Save PIN code.
- Save latitude and longitude where available.

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

## 5.1 Seller Registration

The system must allow individuals or businesses to apply as sellers.

Required information may include:

- Owner name.
- Business name.
- Email.
- Mobile number.
- Shop address.
- PIN code.
- Business type.
- Business registration information where applicable.
- KYC documents.
- Bank or payout details where required.

The final KYC document requirements are subject to client approval and applicable legal requirements.

## 5.2 Seller Approval

Seller applications must support the following states:

- Draft.
- Submitted.
- Under Review.
- Approved.
- Rejected.
- Suspended.

Requirements:

- Admin can review applications.
- Admin can approve applications.
- Admin can reject applications with reasons.
- Admin can request additional information.
- Seller can view application status.
- Seller receives status notifications.

Only approved and active sellers may operate on the marketplace.

## 5.3 Shop Management

Sellers must be able to:

- Create shop profile.
- Update shop name.
- Update shop description.
- Upload shop logo.
- Upload shop banner.
- Manage contact details.
- Manage shop address.
- Configure operating hours.
- Configure delivery availability.
- Manage shop status.

Any sensitive business changes may require administrator approval.

## 5.4 Product Management

Sellers must be able to:

- Create products.
- Edit products.
- Update descriptions.
- Upload product images.
- Select categories.
- Configure product variants.
- Set selling prices.
- Set original prices.
- Configure discounts where permitted.
- Activate/deactivate listings.
- View product status.

Products must follow administrator-defined listing rules.

## 5.5 Inventory Management

Requirements:

- Add stock.
- Remove stock.
- Update available quantity.
- View current stock.
- View low-stock products.
- View out-of-stock products.
- Maintain inventory history.
- Record stock adjustments.
- Prevent negative inventory.

Inventory must be seller-specific.

A product sold by multiple sellers must maintain independent stock records for each seller listing.

## 5.6 Seller Order Management

Requirements:

- View new orders.
- View order details.
- Accept orders.
- Reject eligible orders.
- Update preparation status.
- Mark orders ready for pickup.
- View completed orders.
- View cancelled orders.
- View order history.

Seller order status changes must follow an approved state-transition workflow.

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

# 7. DELIVERY PARTNER REQUIREMENTS

Module ID: DELIVERY

## 7.1 Registration and Verification

Requirements:

- Delivery partner registration.
- Personal details.
- Contact information.
- Address.
- Verification documents.
- Vehicle information where required.
- Approval workflow.

## 7.2 Delivery Assignment

The system must support:

- Assigning delivery tasks.
- Viewing assigned orders.
- Accepting assignments.
- Rejecting eligible assignments.
- Reassigning delivery tasks.
- Monitoring assignment status.

The assignment model must support configurable manual or automated allocation.

## 7.3 Delivery Workflow

Initial proposed workflow:

1. Order confirmed.
2. Seller accepts order.
3. Seller prepares order.
4. Order becomes ready for pickup.
5. Delivery partner is assigned.
6. Delivery partner accepts assignment.
7. Delivery partner collects order.
8. Order is marked out for delivery.
9. Order is delivered.
10. Delivery is completed.

The exact state transitions and exceptions must be defined in the technical architecture.

## 7.4 Delivery Tracking

Requirements:

- Track delivery status.
- Display status updates to customers.
- Display assigned delivery partner information where appropriate.
- Record pickup time.
- Record delivery completion time.
- Record delivery confirmation.

Real-time GPS tracking is a proposed enhancement and requires separate infrastructure and operational approval.

## 7.5 Delivery History and Earnings

Delivery partners must be able to:

- View completed deliveries.
- View cancelled assignments.
- View delivery history.
- View earnings.
- View applicable incentives.
- View payment or settlement status.

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

# 10. MULTI-VENDOR CART AND CHECKOUT

Module ID: CHECKOUT

## 10.1 Cart Structure

A customer cart may contain items from multiple sellers.

Each item must be associated with:

- Product.
- Seller listing.
- Seller.
- Selected variant.
- Quantity.
- Current price.

## 10.2 Checkout Validation

Before order creation, the backend must validate:

- Customer authentication.
- Address validity.
- Address serviceability.
- Seller status.
- Seller operating availability.
- Product status.
- Inventory.
- Price.
- Discounts.
- Coupon eligibility.
- Delivery charges.
- Final payable amount.

## 10.3 Order Creation

A successful checkout must create:

- One parent customer order.
- One or more seller-specific orders.
- Corresponding order items.
- Appropriate payment records.
- Inventory reservation or deduction records.
- Delivery records where applicable.

## 10.4 Pricing

The final order amount may contain:

- Product subtotal.
- Product discounts.
- Coupon discount.
- Delivery charges.
- Applicable platform fees.
- Applicable taxes.
- Other approved charges.

Every charge must be clearly communicated before payment.

## 10.5 Atomicity

Order creation and inventory reservation must be designed to avoid partial or inconsistent transactions.

Concurrent checkouts must not cause overselling.

Payment processing must be idempotent.

The system must handle failed payments without creating incorrectly confirmed orders.

---

# 11. ORDER MANAGEMENT

Module ID: ORDER

## 11.1 Parent Order

The parent order represents the customer's complete shopping transaction.

It must maintain:

- Order ID.
- Customer ID.
- Delivery address snapshot.
- Order amount.
- Payment status.
- Overall order status.
- Creation timestamp.
- Associated seller orders.

## 11.2 Seller Order

Each seller order represents a seller's independent fulfilment responsibility.

It must maintain:

- Seller order ID.
- Parent order reference.
- Seller reference.
- Order items.
- Seller-specific amount.
- Fulfilment status.
- Delivery information.
- Cancellation information.

## 11.3 Order Statuses

Proposed seller order statuses:

- PENDING.
- ACCEPTED.
- REJECTED.
- PROCESSING.
- READY_FOR_PICKUP.
- PICKED_UP.
- OUT_FOR_DELIVERY.
- DELIVERED.
- CANCELLED.

Additional exception statuses may be introduced where required.

## 11.4 Parent Order Status

The parent order status must be derived or maintained consistently from its associated seller orders.

It must support:

- Pending.
- Confirmed.
- Partially fulfilled.
- Partially delivered.
- Completed.
- Partially cancelled.
- Cancelled.

## 11.5 Cancellation

Requirements:

- Customer cancellation within configured eligibility rules.
- Seller rejection where permitted.
- Admin cancellation.
- Cancellation reason.
- Inventory restoration where applicable.
- Payment refund initiation where applicable.
- Order cancellation history.

Cancellation of one seller order must not automatically cancel all other seller orders unless the business rules require it.

---

# 12. PAYMENT REQUIREMENTS

Module ID: PAYMENT

## 12.1 Payment Gateway

Initial proposed gateway: Razorpay.

Supported payment methods:

- UPI.
- Debit Card.
- Credit Card.
- Net Banking.
- Cash on Delivery, where enabled.

## 12.2 Payment Workflow

1. Customer confirms checkout.
2. Backend calculates the final payable amount.
3. Backend creates the payment transaction.
4. Customer completes payment.
5. Payment gateway returns payment information.
6. Backend verifies payment.
7. Verified webhook or server-side verification confirms the result.
8. Order payment status is updated.
9. Customer receives confirmation.

The frontend must never be trusted as the sole source of payment confirmation.

## 12.3 Payment Statuses

Proposed statuses:

- PENDING.
- PROCESSING.
- SUCCESS.
- FAILED.
- CANCELLED.
- REFUND_PENDING.
- PARTIALLY_REFUNDED.
- REFUNDED.

## 12.4 Cash on Delivery

COD must support:

- Configurable availability.
- COD eligibility validation.
- Order confirmation.
- Collection status.
- Cash collection records.
- Reconciliation records.

## 12.5 Refund Management

The platform must support:

- Full refunds.
- Partial refunds.
- Refund reasons.
- Refund status.
- Refund transaction references.
- Refund history.
- Administrative authorization.

The actual refund execution must be integrated with the payment provider.

---

# 13. COMMISSION AND SETTLEMENT REQUIREMENTS

Module ID: FINANCE

## 13.1 Commission Calculation

The system must calculate platform commission according to approved business rules.

Commission may be based on:

- Order item value.
- Seller-specific commission.
- Category-specific commission.
- Approved promotional arrangements.

The commission base, tax treatment and discount allocation must be finalized before financial implementation.

## 13.2 Seller Earnings

Seller financial records must distinguish:

- Gross product sales.
- Discounts.
- Platform commission.
- Refund deductions.
- Other approved deductions.
- Net seller earnings.

## 13.3 Settlements

The platform must maintain:

- Settlement records.
- Seller references.
- Settlement period.
- Gross amount.
- Deductions.
- Net amount.
- Payout reference.
- Settlement status.
- Settlement history.

Proposed settlement statuses:

- PENDING.
- PROCESSING.
- PAID.
- FAILED.
- ON_HOLD.

## 13.4 Financial Integrity

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

Only approved and active sellers can list and sell products.

## BR-002: Seller Isolation

Sellers can only manage their own shop, listings, inventory, orders and financial information.

## BR-003: Inventory Ownership

Every seller listing maintains its own inventory.

## BR-004: Product Availability

A product is purchasable only when its listing is active, the seller is eligible and sufficient stock is available.

## BR-005: Multi-Vendor Cart

Customers may add products from multiple sellers to one cart.

## BR-006: Seller Order Separation

Every seller participating in a parent order must receive an independent seller order.

## BR-007: Inventory Validation

Stock must be revalidated during checkout.

## BR-008: Price Validation

The backend determines final prices. Frontend-provided prices must never be trusted.

## BR-009: Payment Verification

An order must not be marked paid based solely on a frontend success response.

## BR-010: Refund Integrity

Refunds must reference the original payment and be recorded independently.

## BR-011: Commission Integrity

Commission rules must be preserved with relevant transaction records.

## BR-012: Serviceability

Customers must not place orders for addresses outside the applicable service area.

## BR-013: Order Cancellation

Cancellation must follow configured eligibility and fulfilment rules.

## BR-014: Delivery Assignment

Only eligible delivery partners can accept valid delivery assignments.

## BR-015: Delivery Completion

A delivery must have an appropriate completion record.

## BR-016: Account Suspension

Suspended users cannot perform restricted marketplace operations.

## BR-017: Auditability

Sensitive administrative and financial actions must be recorded.

## BR-018: Historical Records

Deleting or deactivating a user, seller or product must not unintentionally destroy historical order and financial information.

## BR-019: Coupon Validation

Coupons must be validated on the backend against all configured eligibility conditions.

## BR-020: Order Snapshots

Orders must preserve product names, quantities, prices and applicable charges as they existed when the order was placed.

---

# 18. EDGE CASES AND EXCEPTION HANDLING

The platform must explicitly handle the following situations.

## 18.1 Inventory

- Two customers attempt to purchase the final item simultaneously.
- Seller changes stock during checkout.
- Product becomes unavailable after being added to cart.
- Seller deactivates a listing with items in customer carts.
- Inventory restoration after cancellation.
- Partial fulfilment due to insufficient stock.

## 18.2 Multi-Vendor Orders

- One seller rejects an order while others accept.
- One seller cannot fulfil an item.
- One seller order is cancelled while others continue.
- Different sellers have different delivery availability.
- One seller order is delivered while another remains pending.
- Partial refund for one seller's items.

## 18.3 Payments

- Payment succeeds but the browser closes.
- Payment gateway response is delayed.
- Duplicate payment webhook is received.
- Payment fails after order initiation.
- Payment succeeds but order confirmation processing fails.
- Refund request fails.
- Duplicate refund requests occur.
- COD order is cancelled after seller acceptance.

## 18.4 Delivery

- Delivery partner rejects an assignment.
- No delivery partner is available.
- Delivery partner becomes unavailable.
- Seller delays order preparation.
- Customer is unavailable.
- Delivery address is incorrect.
- Delivery is unsuccessful.
- Delivery partner loses network connectivity.

## 18.5 Authentication and Accounts

- Duplicate email registration.
- Duplicate mobile number registration.
- Suspended account attempts login.
- Expired access token.
- Invalid refresh token.
- Repeated login failures.
- Unauthorized role access.

## 18.6 Coupons and Pricing

- Coupon expires during checkout.
- Coupon usage limit is reached.
- Product price changes after cart addition.
- Seller discount is removed.
- Coupon becomes invalid.
- Minimum order amount is no longer satisfied.

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

# 22. OUT OF SCOPE FOR INITIAL RELEASE

Unless separately approved, the following are excluded from the initial website development scope:

1. Native Android application.
2. Native iOS application.
3. Dedicated seller mobile application.
4. Dedicated delivery partner mobile application.
5. Advanced AI-based recommendations.
6. Machine-learning-based demand forecasting.
7. Automated warehouse management.
8. Advanced route optimization.
9. Automated multi-seller marketplace split payouts.
10. WhatsApp Business automation.
11. Subscription-based customer membership.
12. Loyalty points and reward systems.
13. Advanced marketing automation.
14. International marketplace operations.
15. Multi-currency support.

These features may be considered for future development.

---

# 23. ASSUMPTIONS AND DEPENDENCIES

The following assumptions apply until confirmed otherwise.

1. Marvel's Basket will provide the approved brand assets.
2. The client will provide product and category information.
3. The client will provide seller onboarding policies.
4. The client will provide commission and settlement rules.
5. The client will provide delivery operational policies.
6. Razorpay integration depends on account approval and credentials.
7. Maps integration depends on API access and billing configuration.
8. Hosting and infrastructure depend on final commercial approval.
9. Email and SMS integrations depend on provider configuration.
10. Product images and other media require appropriate usage rights.
11. Final legal policies must be approved by the client.
12. GST, invoicing and marketplace compliance rules require appropriate professional confirmation.

Any assumption affecting implementation must be resolved before its dependent feature is finalized.

---

# 24. REQUIREMENT PRIORITY

Requirements will be classified using three priority levels.

| Priority | Meaning |
|---|---|
| P0 - Critical | Required for the initial production launch |
| P1 - High | Important functionality for a complete marketplace |
| P2 - Future | Enhancement or future development |

### P0 - Critical

- Authentication.
- Role-based access control.
- Customer shopping.
- Seller registration and approval.
- Product management.
- Seller-specific inventory.
- Multi-vendor cart.
- Checkout.
- Order management.
- Payment integration.
- Delivery workflow.
- Admin management.
- Security.
- Production deployment.

### P1 - High

- Advanced product filters.
- Wishlist.
- Reviews and ratings.
- Coupons.
- Advanced analytics.
- Settlement reporting.
- Promotional banners.
- Delivery partner earnings.
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