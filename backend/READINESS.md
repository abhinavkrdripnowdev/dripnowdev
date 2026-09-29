# Day 1–8 implementation and operation

## Implemented

The existing Express/TypeScript and React application is retained. Domain controllers, services and routes live under `src/modules`; shared middleware, integrations, jobs and migrations have dedicated directories. `src/app.ts` is the server entry point. Do not create a second JavaScript server or duplicate migrations.

| Area | Behavior |
| --- | --- |
| Authentication | Customer, seller and delivery registration require email and phone OTP proofs; bcrypt passwords, login, logout, rotating refresh cookies, forgot/reset password, session revocation |
| Authorization | Database roles and permissions, current account/session checks, five account states, ownership checks, strict mutation schemas, audit/security events |
| Administrators | No public admin registration; two distinct administrators approve promotion of an existing verified account |
| Sellers | Business/documents/pickup onboarding, admin review, catalog, images, SKU variants, inventory, base prices, offers/coupons/combos, seller order progression |
| Customers | Public browsing/search/filtering/details, saved guest selection through login, profile, wishlist, multiple/default addresses, map picker and GPS |
| Checkout | Server-priced quotes, multi-seller parent/shipment orders, stock allocation, idempotency keys, separate customer delivery fee and partner earnings, cancellation |
| Payments | Razorpay order creation, HMAC verification, captured payment lookup, raw signed webhooks, duplicate handling, late-payment refund queue, COD cash ledger/reconciliation |
| Delivery | Verified onboarding and approval, availability, fresh location/radius matching, in-app offers, atomic acceptance, pickup/transit/delivery, current-position tracking |
| Finance | Immutable balanced journals, exact integer-paise ledger, seller settlements after protection, configurable delivery earnings and multi-seller bonus, independent payout approval/execution, COD and refund accounting |
| After delivery | Backend-enforced three-hour window, return pickup and inspection, size-exchange stock reservation, reverse and replacement delivery, refund lifecycle and reconciliation |
| Operations | Customer/account management, product moderation, order/reports/financial visibility, platform offers, in-app/email/SMS/push notification outbox and audit trails |

Registration verifies email and phone inline before creating the account. The verified identity's account status is separate from seller/delivery business approval; a pending business cannot sell or deliver. Role names are lowercase in storage (`customer`, `seller`, `delivery_partner`, `admin`, `super_admin`). The legacy `manager` authorization alias remains for compatibility.

## Local setup

Use Node.js 22+ and npm. From each of `backend` and `frontend`, run `npm ci`. Preserve existing environment files; for a new installation copy `backend/.env.example` to `backend/.env` and fill in actual values.

1. Start MySQL 8.4. The root `compose.yaml` is optional: set `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD`, then run `docker compose up -d`. Match backend database credentials to the container configuration.
2. In `backend`, configure `DB_CLIENT=mysql2`, `DB_NAME=dripnow`, host, port and credentials. Run `npm run db:create` with an account allowed to create this database, then `npm run migrate` and `npm run seed`. Use a restricted application DB account afterward.
3. Generate separate random secrets of at least 32 characters for both JWT secret settings. Set `CLIENT_URL` to the frontend origin.
4. Configure SMTP, Twilio, Razorpay, payout, push and geocoding providers as described below. Development may use `SMS_PROVIDER=mock`; OTPs are available only in development server output, never API responses. Unconfigured development email uses a JSON transport, so it does not deliver mail.
5. Run `npm run dev` in backend and frontend. Production uses backend `npm run build && npm start` and a hosted frontend `npm run build` output. Serve over HTTPS. `/health` checks database connectivity.

The application applies migrations before listening and stops on migration failure. `npm run migrate:status` lists migration status. Migration identifiers are stable across compiled JavaScript and TypeScript execution. Back up existing databases before migration. The authoritative migration directory is `src/db/migrations`; `database/migrations` documents this. Existing session/item tables are exposed through compatibility views named `refresh_tokens` and `order_items`.

## Provider configuration

- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`. Confirm delivery and verified sender configuration.
- SMS: `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`. Confirm the sending number and destination permissions with Twilio.
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Register the HTTPS endpoint `/api/v1/payments/webhook` for captured-payment/order-paid events using the same webhook secret. Test real capture and webhook retries in test mode before live keys. A frontend success callback alone never marks an order paid.
- Payout: production requires `PAYOUT_PROVIDER=http`, a secured `PAYOUT_API_URL`, and `PAYOUT_API_KEY`. The adapter sends an idempotency key and expects a provider reference. `manual` accepts a verified bank reference in development/test only. The initiator cannot approve or execute their payout.
- Push: optionally configure `PUSH_API_URL` and `PUSH_API_KEY` for a gateway accepting device tokens, title, message and data. In-app notifications work without it; email and SMS use the configured providers. Failed external notifications retry with bounded backoff.
- Maps: `MAPS_GEOCODING_URL` must point to an authorized hosted/self-hosted Nominatim-compatible service; set `MAPS_USER_AGENT` with an operator contact. Search is explicit and cached. Missing provider configuration returns an error rather than fabricated coordinates. Browser location needs HTTPS (localhost is supported) and permission. Leaflet uses map tiles, which require network access and appropriate provider usage terms.

Distance and radius matching currently use straight-line Haversine estimates, not road routing or traffic ETA. Super-admin pricing settings control customer fees, tax basis points and matching radius. Versioned delivery earning rules control base distance/amount, distance increments and the multi-seller addition. The customer pays one checkout delivery fee; partner earnings remain independent. Defaults are starter values, not a validated commercial/tax policy.

## Initial and subsequent administrators

Register and verify two ordinary accounts first. An operator with database/server access sets `BOOTSTRAP_ADMIN_EMAILS=first@example.com,second@example.com` and runs `npm run admin:bootstrap` in backend. This one-time script refuses when an administrator already exists; it creates the initial super-admin/admin pair without public registration or hardcoded credentials. Subsequent promotions use the admin dashboard nomination and two-person approval flow. The nominee cannot approve their own request. Role changes revoke existing sessions.

## API groups

Authentication uses `/api/auth`. Versioned groups are `/api/v1/customer`, `/products`, `/offers`, `/maps`, `/cart`, `/orders`, `/seller`, `/seller/orders`, `/payments`, `/delivery`, `/notifications`, `/finance`, `/admin`, `/admin/sellers`, `/admin/delivery`, and `/admin/order-requests` (all relative to `/api/v1`). Protected requests use Bearer access tokens; refresh uses the HttpOnly cookie with credentials enabled. Checkout accepts an `Idempotency-Key`; reuse it only for retries of the same checkout. All monetary decisions use server data.

Maintenance runs every minute in the API process: unpaid orders expire after 30 minutes, stock is restored once, return windows close, eligible settlements are created, pending Razorpay orders are reconciled, notifications are dispatched, and expired tokens are cleaned. `npm run jobs` provides a standalone maintenance run. Delivery offers and customer tracking use polling; location storage keeps only the current partner row. Tracking includes forward/reverse tasks, is restricted to the owning customer, and hides locations after delivery.

## Validation and remaining launch gates

Run `npm test` in backend, and `npm run build` in frontend. `tests/integration.test.cjs` runs isolated SQLite migrations and integration cases covering registration, authorization, refresh/reset replay, stock/idempotency, signatures, COD, delivery, admin approvals and returns. SQLite serialization does not prove MySQL concurrency behavior.

`tests/browser-smoke.cjs` exercises the built frontend against an isolated test API: public catalog, guest selection, authentication, quote, COD checkout and order view. It requires Playwright and Chromium/Edge. Set `PLAYWRIGHT_MODULE` to an installed Playwright module and optionally `BROWSER_EXECUTABLE` to the browser executable, then run `node tests/browser-smoke.cjs` from backend. Screenshots are written under ignored `tests/artifacts`.

This workspace passed 21 integration cases, backend/frontend TypeScript checks, production frontend build and customer browser smoke testing. The suite includes authorization boundaries, invalid/expired JWTs, login rate limits, balanced journals, payout separation, multi-seller pricing, delivery earnings, return pickup, exchange replacement delivery, refund accounting, product moderation, notifications, CORS, foreign keys, rollback and orphan checks. Local MySQL connection returned `ECONNREFUSED`; database creation and migrations have therefore not been verified on a running MySQL server. Live SMTP, SMS, push, Razorpay capture/webhook/refund, payout and geocoding require configured services and staging acceptance testing.

Documents and product images currently accept hosted URLs; there is no integrated file-upload/object-storage pipeline. Return requests cover the whole parent order; size exchanges identify one purchased item and replacement variant. Reverse collection and exchange replacement use delivery-partner tasks. Online refunds are verified against the provider's processed refund record; COD refunds require a super-admin reference. Google sign-in is disabled until server-side identity-token verification is implemented.

For multiple API instances, replace in-memory rate limiting with a shared store and verify proxy/IP configuration. Provider calls, MySQL transactions, browser GPS, notification delivery and the full multi-seller journey still need staging tests with actual infrastructure before declaring the system production-ready.
