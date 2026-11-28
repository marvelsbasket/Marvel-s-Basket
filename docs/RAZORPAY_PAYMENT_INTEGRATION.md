# Marvel's Basket — Razorpay Payment Integration Guide (Phase 13)

**Provider:** Razorpay  
**Currency:** INR (₹) — integer paise (`amount * 100`)  
**Architecture:** NestJS `PaymentsModule` + Official `razorpay` Node SDK + BullMQ (`payment-webhooks`) + Next.js Standard Checkout

---

## 1. Architecture & Payment Flow

1. **Checkout Preparation (Phase 11):** Customer prepares checkout (`POST /api/v1/checkout/prepare`), locking prices and reserving stock for 15 minutes (`CheckoutSession` + `StockReservation`).
2. **Payment Initiation:** Customer clicks **Pay Now** on `/checkout`. Frontend calls `POST /api/v1/payments/initiate`.
   - Backend creates an internal `Order` (`status: PENDING`, `paymentMethod: RAZORPAY`, `paymentStatus: PENDING`) without committing stock yet.
   - Backend computes `amountPaise` strictly from DB `order.totalAmount`, creates a Razorpay Order (`POST /v1/orders`), and persists a `Payment` attempt (`status: CREATED`, `providerOrderId`).
   - Only the public `RAZORPAY_KEY_ID` and `orderId` are returned to the browser.
3. **Standard Checkout:** Frontend loads `https://checkout.razorpay.com/v1/checkout.js` and opens the modal.
4. **Server-Side Signature Verification:** Frontend sends `{ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }` to `POST /api/v1/payments/verify`.
   - Backend retrieves the expected `providerOrderId` from PostgreSQL and verifies `HMAC-SHA256(providerOrderId + "|" + razorpayPaymentId, RAZORPAY_KEY_SECRET)` using `crypto.timingSafeEqual`.
   - Backend fetches the live payment from Razorpay (`payments.fetch`) to verify `status === 'captured'`, `amount`, and `currency`.
   - Inside an ACID transaction, backend commits `StockReservation`s (`commitReservationInTx`), clears the cart, marks `Payment` `CAPTURED`, and sets `Order.paymentStatus = SUCCESS`.
5. **Durable Webhook Inbox:** `POST /api/v1/payments/webhooks/razorpay` verifies `X-Razorpay-Signature` against the raw HTTP request body (`req.rawBody`) **before** JSON parsing, deduplicates `x-razorpay-event-id` via PostgreSQL unique constraint `(provider, event_id)`, and enqueues async BullMQ processing.

---

## 2. Environment Configuration

Never commit real credentials. Add placeholders only in `.env.example`.

| Variable | Description | Example |
|---|---|---|
| `RAZORPAY_MODE` | `test` or `live` | `test` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (`rzp_test_*` or `rzp_live_*`) | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret (backend-only) | `...` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC secret (backend-only) | `...` |
| `RAZORPAY_PREVIOUS_WEBHOOK_SECRET` | Optional rotated secret for in-flight retries | `...` |
| `RAZORPAY_CURRENCY` | Currency code | `INR` |
| `RAZORPAY_CAPTURE_MODE` | `automatic` or `manual` | `automatic` |
| `COD_MAX_AMOUNT` | Maximum COD order value (ADR-009) | `1500` |

**Startup Guardrails (`validation.schema.ts`):**
- `NODE_ENV=production` requires `RAZORPAY_MODE=live`.
- `RAZORPAY_MODE=live` rejects `rzp_test_*` keys or placeholder secrets.
- `RAZORPAY_MODE=test` rejects `rzp_live_*` keys.

---

## 3. Razorpay Dashboard Setup & Local Webhook Testing

### Test Mode Setup
1. Log in to the **Razorpay Dashboard** and toggle **Test Mode** ON.
2. Go to **Account & Settings → API Keys → Generate Test Key** to obtain `RAZORPAY_KEY_ID` (`rzp_test_*`) and `RAZORPAY_KEY_SECRET`.
3. Go to **Account & Settings → Webhooks → Add New Webhook**:
   - **Webhook URL:** Public HTTPS URL pointing to `POST /api/v1/payments/webhooks/razorpay`.
   - **Secret:** Generate a strong secret and set `RAZORPAY_WEBHOOK_SECRET`.
   - **Events:** `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`.

### Local Development Webhooks
Razorpay cannot deliver webhooks directly to `localhost`. Use a permitted secure tunnel (e.g., `zrok` or a staging deployment URL) forwarding HTTPS traffic to `http://localhost:4000/api/v1/payments/webhooks/razorpay`.

### Webhook Secret Rotation
1. Set `RAZORPAY_PREVIOUS_WEBHOOK_SECRET` to the old secret and `RAZORPAY_WEBHOOK_SECRET` to the new secret.
2. Update the secret in the Razorpay Dashboard.
3. After 24 hours (once Razorpay's retry window expires), remove `RAZORPAY_PREVIOUS_WEBHOOK_SECRET`.

---

## 4. Payment & Refund State Machines

- **Payment States:** `CREATED` → `PENDING` / `PROCESSING` → `AUTHORIZED` → `CAPTURED` / `SUCCESS` → `REFUND_PENDING` → `PARTIALLY_REFUNDED` / `REFUNDED` (or `FAILED` / `CANCELLED`).
- **Out-of-Order Protection:** `PAYMENT_PROGRESS_RANK` prevents delayed events (e.g., `payment.authorized` arriving after `payment.captured`) from downgrading a payment.
- **Late Payment After Reservation Expiry:** If a payment is captured after the 15-minute `StockReservation` expires, the backend atomically checks and locks inventory (`tryAcquireAndCommitForOrderInTx`). If stock is unavailable, it **never** creates negative stock or confirms an unfulfillable order — instead, it cancels the order, marks `Order.paymentStatus = REFUND_PENDING`, and creates an automatic `Refund` request.
- **Refund Idempotency:** `RefundsService` sends the `X-Refund-Idempotency` header (10+ alphanumeric/hyphen/underscore chars) to `POST /v1/payments/:id/refund` and enforces remaining refundable balance inside a database transaction.

---

## 5. Production Launch Checklist

- [ ] Merchant KYC & Live Mode activated in Razorpay Dashboard.
- [ ] Separate Live Mode API keys (`rzp_live_*`) configured in production secrets manager.
- [ ] Separate Live Mode Webhook URL (`https://<api-domain>/api/v1/payments/webhooks/razorpay`) & secret configured.
- [ ] HTTPS / TLS verified on webhook endpoint.
- [ ] Required payment methods (UPI, Cards, Net Banking) enabled on Razorpay Dashboard.
- [ ] `NODE_ENV=production` and `RAZORPAY_MODE=live` verified at startup.
- [ ] Queue monitoring active for `payment-webhooks` BullMQ queue.
