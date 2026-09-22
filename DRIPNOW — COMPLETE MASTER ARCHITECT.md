# DRIPNOW — COMPLETE MASTER ARCHITECTURE \& DEVELOPMENT PLAN

## 1\. Platform Overview



DripNow is a multi-seller fashion marketplace with:



* Customer application
* Seller application
* Delivery Partner application
* Admin panel
* Super Admin financial panel
* Central authentication
* Multi-seller cart and checkout
* Razorpay + COD
* Delivery management
* Returns/exchanges
* Seller settlements
* Delivery partner earnings
* Financial ledger
* Offers/coupons
* Notifications
* Audit/security system
* Core architecture

&#x20;                        DRIPNOW

&#x20;                           │

&#x20;       ┌───────────────────┼────────────────────┐

&#x20;       │                   │                    │

&#x20;   CUSTOMER             SELLER          DELIVERY PARTNER

&#x20;       │                   │                    │

&#x20;       └───────────────────┼────────────────────┘

&#x20;                           │

&#x20;                     ORDER SYSTEM

&#x20;                           │

&#x20;               ┌───────────┴───────────┐

&#x20;               │                       │

&#x20;            PAYMENT                 DELIVERY

&#x20;               │                       │

&#x20;               └───────────┬───────────┘

&#x20;                           │

&#x20;                    FINANCIAL LEDGER

&#x20;                           │

&#x20;                  ┌────────┴────────┐

&#x20;                  │                 │

&#x20;               SELLER          DELIVERY PARTNER

&#x20;              PAYABLE              EARNING

&#x20;                  │                 │

&#x20;                  └────────┬────────┘

&#x20;                           │

&#x20;                      SUPER ADMIN

&#x20;                           │

&#x20;                   FINANCIAL PAYOUTS



&#x20;            ADMIN

&#x20;               │

&#x20;      Operational control

&#x20;               │

&#x20;      ❌ No money transfer





## 2\. Five Main Account Roles



### Customer



Responsible for:



* Browsing
* Searching
* Cart
* Checkout
* Payment
* Orders
* Cancellation
* Return
* Exchange
* Profile
* Seller



Responsible for:



* Products
* Inventory
* Pricing
* Discounts
* Accepting orders
* Preparing orders
* Marking ready for pickup
* Seller-side returns/exchanges
* Viewing earnings
* Delivery Partner



Responsible for:



* Accepting delivery tasks
* Pickup
* Delivery
* COD collection
* Delivery earnings
* Choosing payout frequency
* Admin



Responsible for operations:



* Seller approval
* Delivery partner approval
* Customer management
* Product moderation
* Order monitoring
* Return/exchange management
* Account suspension
* Operational reports
* Audit monitoring



**Note : Admin cannot transfer money.**



## Super Admin



Responsible for financial control:



* Seller settlements
* Delivery partner payouts
* Financial reconciliation
* COD reconciliation
* Refund financial operations
* Platform financial configuration
* Delivery earning configuration
* Payout execution



One Super Admin approval is enough.



## 3\. Central Identity Architecture



One central user identity:



User

&#x20;│

&#x20;├── Customer role

&#x20;├── Seller role

&#x20;├── Delivery Partner role

&#x20;├── Admin role

&#x20;└── Super Admin role



A user may have multiple permitted roles.



Security rule:



User cannot assign themselves a role.



Role assignment is controlled by authorized backend operations.



## 4\. Customer Architecture



**Customer journey**





DripNow

&#x20;↓

Browse

&#x20;↓

Search

&#x20;↓

Product

&#x20;↓

Add to cart

&#x20;↓

Checkout

&#x20;↓

Login/Register if required

&#x20;↓

Address

&#x20;↓

Delivery

&#x20;↓

Payment

&#x20;↓

Order



Customer does not need to register just to browse.







**Customer modules**





Customer

├── Registration

├── Email verification

├── Phone OTP

├── Login

├── Logout

├── Forgot password

├── Reset password

├── Profile

├── Addresses

├── Product browsing

├── Search

├── Filters

├── Wishlist

├── Cart

├── Checkout

├── Razorpay

├── COD

├── Orders

├── Tracking

├── Cancellation

├── Returns

└── Exchanges





## 5\. Seller Architecture





**Registration**



Seller registration

&#x20;↓

Email verification

&#x20;↓

Phone verification

&#x20;↓

Seller information

&#x20;↓

Documents/details

&#x20;↓

PENDING

&#x20;↓

Admin review

&#x20;↓

APPROVED

&#x20;↓

Seller dashboard









**Seller modules**



Seller

├── Dashboard

├── Products

├── Product variants

├── Images

├── Inventory

├── Orders

├── Accept order

├── Prepare order

├── Ready for pickup

├── Discounts

├── Coupons

├── Combo offers

├── Returns

├── Exchanges

├── Earnings

└── Profile





## 6\. Seller Pricing Rules



Seller enters the base price.



Example:



Dress

Base price = ₹700







Seller does not independently add:



* Delivery fees
* Platform fees
* Other platform-controlled charges









Seller can create:



Percentage discount

10%

15%

20%



Non-code discount

₹700 → ₹350



Combo offer

Dress + Bag

→ Combo price







## 7\. Product Architecture





Seller

&#x20;↓

Product

&#x20;↓

Product Variant

&#x20;↓

Inventory







**Product supports:**



* Name
* Description
* Images
* Category
* Base price
* Sizes
* Colors
* Variants
* SKU
* Stock
* Availability
* Seller relationship



Customer listing primarily focuses on the product, rather than exposing unnecessary seller/shop information.





## 8\. Cart Architecture



Customer can have products from multiple sellers in one cart.



Example:



Cart

├── Seller A

│   ├── Dress ₹700

│   └── Bag ₹500

│

└── Seller B

&#x20;   └── Shoes ₹1,200









Customer sees:



One cart

Total = ₹2,400







## 9\. Multi-Seller Checkout Architecture



Backend splits the cart into seller-specific orders.



Parent Checkout

&#x20;     │

&#x20;     ├── Seller Order A

&#x20;     │     ├── Dress

&#x20;     │     └── Bag

&#x20;     │

&#x20;     └── Seller Order B

&#x20;           └── Shoes





**This is necessary for:**



* Seller fulfillment
* Seller settlement
* Delivery
* Returns
* Exchanges
* Financial accounting





## 10\. Order Architecture



Three levels:



Checkout

&#x20;  ↓

Parent Order

&#x20;  ↓

Seller Orders

&#x20;  ↓

Order Items







**Parent order**



Represents the customer's complete purchase.



**Seller order**



Represents one seller's portion.



**Order item**



Represents each product/variant.







## 11\. Order Lifecycle





Order Created

&#x20;↓

Payment Pending

&#x20;↓

Payment Confirmed

&#x20;↓

Seller Order Created

&#x20;↓

Seller Accepts

&#x20;↓

Preparing

&#x20;↓

Ready for Pickup

&#x20;↓

Delivery Partner Assigned

&#x20;↓

Picked Up

&#x20;↓

In Transit

&#x20;↓

Delivered

&#x20;↓

3-Hour Return Window

&#x20;↓

Completed









**Possible alternative states:**



Cancelled

Return Requested

Return Approved

Exchange Requested

Exchange Completed

Refunded







## 12\. Delivery Partner Architecture



**Registration**





Registration

&#x20;↓

Email verification

&#x20;↓

Phone OTP

&#x20;↓

Personal details

&#x20;↓

Vehicle/details

&#x20;↓

Required documents

&#x20;↓

PENDING

&#x20;↓

Admin approval

&#x20;↓

APPROVED







**Dashboard**

Delivery Partner

├── Dashboard

├── Available deliveries

├── Accepted deliveries

├── Pickup

├── Active delivery

├── Completed deliveries

├── Earnings

├── Payout preference

└── Profile







## 13\. Delivery Flow





Seller accepts

&#x20;↓

Seller prepares

&#x20;↓

Ready for pickup

&#x20;↓

Delivery matching

&#x20;↓

Nearby delivery partners notified

&#x20;↓

Partner accepts

&#x20;↓

Pickup

&#x20;↓

In transit

&#x20;↓

Customer

&#x20;↓

Delivered







## 14\. Delivery Earning Architecture



**Your rule:**



First kilometre has a fixed base earning, and additional distance adds a configurable amount.



Example:



1 km → ₹20

2 km → ₹25

3 km → ₹30

4 km → ₹35



The actual numbers will be configurable.







**Database/configuration concept:**



Delivery Earning Rule

├── Base distance

├── Base amount

├── Additional distance unit

└── Additional amount



No hard-coded business amount.







## 15\. Multi-Seller Delivery Earning



**Example:**



Customer

&#x20;├── Seller A

&#x20;└── Seller B

&#x20;      ↓

Same delivery partner









**The delivery partner receives:**



Normal distance earning

\+

Configured multi-seller additional earning



The Admin controls the additional amount/rule.









Example:



Distance earning      ₹30

Multi-seller addition ₹10

\-------------------------

Total                  ₹40







## 16\. Delivery Partner Payout Preference



**Delivery partner chooses:**



Daily

Weekly

Monthly







**Example:**



Partner chooses Weekly

&#x20;↓

System calculates weekly payable

&#x20;↓

Super Admin sees payout

&#x20;↓

Super Admin pays partner



Partner can change the preference.









## 17\. Customer Return Rule



This is a key DripNow business rule.



**Return window = 3 hours after delivery.**





Delivered

&#x20;↓

3-hour timer

&#x20;↓

Return available

&#x20;↓

3 hours completed

&#x20;↓

Return disabled







The frontend hides/disables the button.



The backend also rejects the request after the deadline.



No normal return request should be allowed after the 3-hour window.







## 18\. Exchange Architecture



Example:







Customer ordered L

&#x20;↓

Needs XL

&#x20;↓

Exchange request

&#x20;↓

Check XL availability

&#x20;↓

Pickup L

&#x20;↓

Deliver XL









Exchange is separate from refund.







## 19\. Payment Architecture





**Razorpay**





Customer

&#x20;↓

Checkout

&#x20;↓

Backend creates payment

&#x20;↓

Razorpay

&#x20;↓

Customer pays

&#x20;↓

Payment verification/webhook

&#x20;↓

Backend confirms payment

&#x20;↓

Order confirmed







Payment status is confirmed by the backend.







## 20\. COD Architecture





Customer selects COD

&#x20;↓

Order confirmed

&#x20;↓

Seller prepares

&#x20;↓

Delivery partner

&#x20;↓

Customer

&#x20;↓

Cash collected

&#x20;↓

COD record

&#x20;↓

Reconciliation

&#x20;↓

Financial ledger







**If the original delivery partner isn't available for a required follow-up:**





Original partner unavailable

&#x20;↓

Another delivery partner assigned

&#x20;↓

Task completed

&#x20;↓

Correct partner earning recorded







## 21\. Financial Architecture



Do not simply store balances like:



seller.balance = 50000











**Use a ledger.**





Customer Payment

&#x20;↓

Financial Transaction

&#x20;↓

Ledger

&#x20;↓

Seller Payable

&#x20;↓

Settlement

&#x20;↓

Seller Payout







**And:**







Delivery Completed

&#x20;↓

Delivery Earning

&#x20;↓

Delivery Payable

&#x20;↓

Payout

&#x20;↓

Delivery Partner







Every financial movement gets a traceable record.









## 22\. Seller Settlement Rule



Your decision:



**3-hour settlement protection period.**





Delivered

&#x20;↓

3 hours

&#x20;↓

No valid return request

&#x20;↓

Seller payable

&#x20;↓

Super Admin

&#x20;↓

Seller settlement







## 23\. Super Admin Financial Architecture





SUPER ADMIN

│

├── Financial Dashboard

├── Seller Payables

├── Seller Settlements

├── Delivery Partner Earnings

├── Delivery Partner Payouts

├── COD Reconciliation

├── Refunds

├── Financial Ledger

├── Financial Reports

├── Delivery Earning Rules

└── Payout Execution







Super Admin can transfer/release money.



Admin cannot.



## 24\. Admin Architecture





ADMIN

│

├── Customers

├── Sellers

│   ├── Pending

│   ├── Approved

│   └── Suspended

│

├── Delivery Partners

│   ├── Pending

│   ├── Approved

│   └── Suspended

│

├── Products

├── Orders

├── Returns

├── Exchanges

├── Categories

├── Reports

├── Notifications

└── Audit Logs









**Admin does not have:**



❌ Seller payout

❌ Delivery payout

❌ Money transfer

❌ Settlement release



Backend permission enforcement is mandatory.







## 25\. Financial Permission Separation







ADMIN

&#x20;│

&#x20;├── APPROVE\_SELLER

&#x20;├── APPROVE\_DELIVERY\_PARTNER

&#x20;├── MANAGE\_PRODUCTS

&#x20;├── MANAGE\_ORDERS

&#x20;├── MANAGE\_USERS

&#x20;└── VIEW\_FINANCIAL\_DATA

&#x20;      ❌ PAYOUT









SUPER ADMIN

&#x20;│

&#x20;├── Everything permitted to Admin where appropriate

&#x20;├── SELLER\_SETTLEMENT

&#x20;├── DELIVERY\_PAYOUT

&#x20;├── REFUND\_FINANCIAL\_ACTION

&#x20;├── COD\_RECONCILIATION

&#x20;└── FINANCIAL\_CONFIGURATION







## 26\. No Dual Approval



Your decision:







Super Admin

&#x20;↓

Review payout

&#x20;↓

Approve

&#x20;↓

Execute







No second Super Admin is required.







## 27\. COD Reconciliation



The system needs to record:







COD Record

├── Expected amount

├── Collected amount

├── Delivery partner

├── Collection date

├── Reconciliation status

└── Difference









Then:



COD Collection

&#x20;↓

Reconciliation

&#x20;↓

Verified

&#x20;↓

Ledger

&#x20;↓

Settlement







## 28\. Refund Architecture





Return request

&#x20;↓

Validate 3-hour window

&#x20;↓

Review

&#x20;↓

Approve

&#x20;↓

Return/pickup process

&#x20;↓

Refund calculation

&#x20;↓

Refund initiated

&#x20;↓

Refund completed







Refund creates financial ledger records.







## 29\. Coupon \& Offer Architecture





Offers

├── Seller percentage discount

├── Seller non-code discount

├── Seller combo

├── Platform coupon

├── Platform offer

└── Future promotional rules





## 30\. Authentication Architecture



**Shared authentication foundation:**



Registration

&#x20;↓

Email verification

&#x20;↓

Phone OTP

&#x20;↓

Login

&#x20;↓

Access token

&#x20;↓

Refresh token

&#x20;↓

Role/permission authorization



**Security:**



* bcrypt
* Rate limiting
* Refresh-token security
* Email verification
* Phone verification
* Password reset
* Account status checks
* Role-based access
* Permission-based access
* Audit logging
* Security event logging
* Mass-assignment protection
* No self-role escalation





## 31\. Account Status





PENDING

APPROVED

REJECTED

SUSPENDED

BLOCKED







Seller and Delivery Partner require approval.\\









## 32\. Audit Log



Every sensitive action is logged.







AuditLog

├── User

├── Role

├── Action

├── Entity

├── Entity ID

├── Old value

├── New value

├── IP

├── User agent

└── Timestamp









**Examples:**



Admin approved seller

Admin approved delivery partner

Admin suspended account

Super Admin paid seller

Super Admin paid delivery partner

Customer requested return

Seller accepted order

Delivery partner accepted task







## 33\. Notification Architecture





Notification Service

│

├── Email

├── SMS

├── Push

└── In-app









**Important events:**



* Registration
* Verification
* Seller approval
* Delivery approval
* Order placed
* Seller accepted
* Ready for pickup
* Delivery assigned
* Pickup
* Out for delivery
* Delivered
* Return window
* Return
* Exchange
* Refund
* Settlement
* Payout







## 34\. Backend Architecture





backend/

│

├── prisma/

│   ├── schema.prisma

│   └── seed.js

│

├── src/

│   ├── config/

│   ├── controllers/

│   ├── routes/

│   ├── services/

│   ├── middleware/

│   ├── validators/

│   ├── utils/

│   │

│   ├── integrations/

│   │   ├── email/

│   │   ├── sms/

│   │   ├── payment/

│   │   └── payout/

│   │

│   ├── db/

│   ├── jobs/

│   └── server.js

│

└── tests/









**Architecture:**



Route

&#x20;↓

Middleware

&#x20;↓

Validator

&#x20;↓

Controller

&#x20;↓

Service

&#x20;↓

Prisma

&#x20;↓

MySQL







## 35\. Database Architecture



**Core entities:**



User

Role

Permission

UserRole

RolePermission



CustomerProfile

SellerProfile

DeliveryPartnerProfile

AdminProfile



Address



Category

Product

ProductVariant

ProductImage

Inventory



Cart

CartItem



Order

SellerOrder

OrderItem



Payment

PaymentTransaction



DeliveryTask

DeliveryAssignment

DeliveryFee

DeliveryEarning

DeliveryEarningRule



Coupon

Discount

ComboOffer



ReturnRequest

ExchangeRequest

Refund



FinancialAccount

FinancialTransaction

LedgerEntry



Settlement

Payout

PayoutApproval



CODRecord

CODReconciliation



Notification

AuditLog

SecurityEvent







## 36\. Configurable Business Rules



Important business values should be configurable.



PlatformConfiguration









Examples:



return\_window\_hours = 3

seller\_settlement\_hold\_hours = 3









Delivery:



DeliveryEarningRule

├── Base distance

├── Base earning

├── Additional distance

└── Additional earning









Multi-seller:



MultiSellerDeliveryRule

├── Seller count

└── Additional earning



This allows the business to change values without rewriting application logic.







## 37\. Frontend Architecture







**Separate application areas:**



/              → Customer

/seller        → Seller

/delivery      → Delivery Partner

/admin         → Admin

/super-admin   → Super Admin







**Frontend structure:**



src/

├── pages/

├── components/

├── layouts/

├── routes/

├── services/

├── hooks/

├── context/

├── utils/

└── assets/







## 38\. Complete Order + Money Flow







CUSTOMER

&#x20;  ↓

BROWSE

&#x20;  ↓

CART

&#x20;  ↓

CHECKOUT

&#x20;  ↓

PAYMENT

&#x20;  ↓

PARENT ORDER

&#x20;  │

&#x20;  ├──────────────┐

&#x20;  ↓              ↓

SELLER A       SELLER B

&#x20;  ↓              ↓

ACCEPT          ACCEPT

&#x20;  ↓              ↓

PREPARE         PREPARE

&#x20;  ↓              ↓

READY           READY

&#x20;  └──────┬───────┘

&#x20;         ↓

&#x20;   DELIVERY SYSTEM

&#x20;         ↓

&#x20;  DELIVERY PARTNER

&#x20;         ↓

&#x20;       PICKUP

&#x20;         ↓

&#x20;     DELIVERY

&#x20;         ↓

&#x20;      DELIVERED

&#x20;         ↓

&#x20;    3-HOUR WINDOW

&#x20;         │

&#x20;     ┌───┴────┐

&#x20;     ↓        ↓

&#x20;  RETURN    COMPLETE

&#x20;              ↓

&#x20;      ┌───────┴────────┐

&#x20;      ↓                ↓

SELLER PAYABLE    DELIVERY EARNING

&#x20;      ↓                ↓

&#x20; 3-HOUR HOLD      PAYOUT PREFERENCE

&#x20;      ↓                ↓

&#x20;SUPER ADMIN       SUPER ADMIN

&#x20;      ↓                ↓

&#x20;SELLER PAYOUT    PARTNER PAYOUT







## 39\. Development Plan







##### Phase 0 — Foundation





Project structure

Environment configuration

Express

MySQL

Prisma

Database connection

Error handling

Logging

Security foundation

CORS

Rate limiting

Health check

Git setup

Testing foundation









##### Phase 1 — Identity \& Authentication





User

Role

Permission

UserRole

RolePermission



Registration

Login

Logout

Email verification

Phone OTP

Refresh token

Forgot password

Reset password

Account status

Audit logs

Security events







##### Phase 2 — Customer





Customer profile

Addresses

Product browsing

Search

Filters

Product details

Wishlist

Cart







##### Phase 3 — Seller





Seller registration

Seller approval

Seller dashboard

Products

Variants

Images

Inventory

Discounts

Combo offers

Seller orders

Order acceptance

Preparation

Ready for pickup





##### Phase 4 — Delivery Partner







Delivery registration

Admin approval

Delivery dashboard

Delivery task

Partner matching

Accept delivery

Pickup

In transit

Delivered

Distance calculation

Earning calculation

Payout preference







##### Phase 5 — Checkout \& Orders





Multi-seller cart

Parent order

Seller orders

Order items

Address

Delivery calculation

Discount calculation

Order state machine







##### Phase 6 — Payments





Razorpay

Payment order

Payment verification

Webhooks

COD

COD records

Payment states

Failed payments





##### Phase 7 — Financial System





Financial accounts

Ledger

Transactions

Seller payable

3-hour settlement rule

Delivery earnings

Multi-seller earning

COD reconciliation

Seller settlement

Delivery payout

Daily/weekly/monthly payout

Super Admin financial controls





##### Phase 8 — Returns / Exchanges / Refunds





3-hour return window

Return request

Return validation

Exchange

Size exchange

Return pickup

Refund

Refund ledger





##### Phase 9 — Offers





Coupons

Percentage discounts

Non-code discounts

Combo offers

Platform offers

Seller offers





##### Phase 10 — Admin





Admin dashboard

Seller approval

Delivery approval

Customer management

Product moderation

Order management

Return management

Exchange management

Account suspension

Reports

Audit





##### Phase 11 — Super Admin





Super Admin dashboard

Financial dashboard

Seller settlement

Delivery payout

COD reconciliation

Refund financial operations

Financial configuration

Delivery earning rules

Multi-seller earning rules

Payout history

Financial reports







##### Phase 12 — Notifications \& Background Jobs





Email

SMS

Push

In-app notifications



Background jobs

OTP expiry

Payment processing

Notifications

Settlement eligibility

Payout batches

COD reconciliation







##### Phase 13 — Testing





Unit tests

Integration tests

API tests

Authentication tests

Authorization tests

Payment tests

COD tests

Order tests

Delivery tests

Return tests

Exchange tests

Refund tests

Settlement tests

Payout tests

Security tests





##### Phase 14 — Production





Production database

Backend deployment

Frontend deployment

Payment production

Email/SMS production

Domain

SSL

Monitoring

Logging

Backups

CI/CD

Error tracking

Security monitoring









## NEW SECTION 8A — MAP \& LOCATION ARCHITECTURE



This should be a dedicated section in the master architecture.



#### 8A. Map Integration Architecture



DripNow will use a map service for:



Customer address selection

Location search

Current location

Map pin selection

Reverse geocoding

Seller/warehouse location

Delivery partner location

Distance calculation

Nearby delivery partner matching

Delivery route/tracking

Delivery distance-based earnings



Architecture:



&#x20;                        MAP \& LOCATION SYSTEM

&#x20;                                 │

&#x20;             ┌───────────────────┼───────────────────┐

&#x20;             │                   │                   │

&#x20;         CUSTOMER             SELLER          DELIVERY PARTNER

&#x20;             │                   │                   │

&#x20;        Address/Pin        Store/Warehouse       GPS Location

&#x20;             │                   │                   │

&#x20;             └───────────────────┼───────────────────┘

&#x20;                                 │

&#x20;                                 ▼

&#x20;                        MAP SERVICE LAYER

&#x20;                                 │

&#x20;            ┌────────────────────┼────────────────────┐

&#x20;            │                    │                    │

&#x20;        Geocoding          Distance Calculation    Tracking

&#x20;            │                    │                    │

&#x20;            └────────────────────┼────────────────────┘

&#x20;                                 │

&#x20;                                 ▼

&#x20;                        DELIVERY SYSTEM

&#x20;                                 │

&#x20;                 ┌───────────────┴───────────────┐

&#x20;                 │                               │

&#x20;            Partner Matching               Earnings











#### 8B. Customer Map Integration



**Customer address flow:**









Customer

&#x20;  ↓

Add Address

&#x20;  ↓

Search Location

&#x20;  ↓

Map

&#x20;  ↓

Select Location

&#x20;  ↓

Move/adjust Pin

&#x20;  ↓

Confirm Location

&#x20;  ↓

Reverse Geocoding

&#x20;  ↓

Address Details

&#x20;  ↓

Latitude + Longitude

&#x20;  ↓

Save Address









**Customer can:**



* Search for an address
* Select a location on the map
* Use current location
* Move the location pin
* Confirm delivery location
* Save multiple addresses
* Select default address



**Address should contain:**



Address

├── ID

├── User ID

├── Address Line

├── Landmark

├── City

├── State

├── Pincode

├── Latitude

├── Longitude

├── Address Type

└── Is Default







#### 8C. Seller Map Integration



Seller registration/profile should store the seller's operating location.









Seller

&#x20;↓

Business/Warehouse Address

&#x20;↓

Map

&#x20;↓

Latitude + Longitude

&#x20;↓

Seller Location









Seller location will be used for:



* Delivery distance
* Delivery fee calculation
* Delivery partner matching
* Pickup location
* Route calculation



Seller location:





SellerLocation

├── Seller ID

├── Address

├── Latitude

├── Longitude

└── Active







#### 8D. Delivery Partner Location





Delivery partners can share their current location when they are available for delivery.









Delivery Partner

&#x20;      ↓

Location Permission

&#x20;      ↓

GPS Location

&#x20;      ↓

Latitude + Longitude

&#x20;      ↓

Backend

&#x20;      ↓

Available Partner Pool









The system can then identify suitable nearby delivery partners.



Example:



Seller

&#x20; │

&#x20; │

&#x20; │ 2.4 km

&#x20; │

&#x20; ▼

Delivery Partner

&#x20; │

&#x20; │ 3.1 km

&#x20; │

&#x20; ▼

Customer







#### 8E. Distance Calculation



The map service will calculate distances between relevant locations.



Examples:



**Seller → Customer**



Seller

&#x20;↓

Distance Calculation

&#x20;↓

Customer





**Delivery Partner → Seller**



Delivery Partner

&#x20;↓

Distance Calculation

&#x20;↓

Seller





**Delivery Partner → Customer**



Delivery Partner

&#x20;↓

Distance Calculation

&#x20;↓

Customer



These distances can be used for:



* Delivery assignment
* Delivery fee
* Delivery earnings
* Delivery ETA
* Route information





#### 8F. Nearby Delivery Partner Matching

&#x09;



When an order becomes:



READY\_FOR\_PICKUP









the system starts delivery partner matching.







Seller Ready

&#x20;     ↓

Get Seller Coordinates

&#x20;     ↓

Find Available Delivery Partners

&#x20;     ↓

Calculate Distance

&#x20;     ↓

Filter Nearby Partners

&#x20;     ↓

Notify Eligible Partners

&#x20;     ↓

Partner Accepts

&#x20;     ↓

Delivery Assignment









Important:



**The exact matching algorithm should be configurable later.**



Initially we can use:





Available

\+

Approved

\+

Not currently assigned

\+

Within configured radius



Then select suitable partners based on distance/availability.









#### 8G. Delivery Tracking









After a delivery partner accepts:





Partner Accepts

&#x20;      ↓

Pickup

&#x20;      ↓

In Transit

&#x20;      ↓

Location Updates

&#x20;      ↓

Customer Map

&#x20;      ↓

Delivered









Customer can see:



┌─────────────────────────────┐

│                             │

│          MAP                │

│                             │

│     📍 Partner              │

│           ↓                 │

│           ↓                 │

│           ↓                 │

│                   📍        │

│                Customer     │

│                             │

└─────────────────────────────┘



For the MVP, we can implement basic location updates first.



Later we can improve:



* Live tracking
* ETA
* Route display
* Location update frequency
* Delivery history





#### 8H. Map Data Architecture



Add these database entities.



**Address**





Address

├── id

├── user\_id

├── address\_line

├── landmark

├── city

├── state

├── pincode

├── latitude

├── longitude

├── type

└── is\_default











**SellerLocation**





SellerLocation

├── id

├── seller\_id

├── address\_id

├── latitude

├── longitude

└── active









**DeliveryPartnerLocation**





DeliveryPartnerLocation

├── id

├── delivery\_partner\_id

├── latitude

├── longitude

└── updated\_at









For live tracking, we should avoid permanently storing every GPS update unless required.







#### 14\. Delivery Earning Architecture — Map Added



Your existing rule stays the same, but the distance comes from the map/distance service.





Seller Location

&#x20;      ↓

Map Distance Calculation

&#x20;      ↓

Delivery Distance

&#x20;      ↓

Delivery Earning Rule

&#x20;      ↓

Partner Earning









**Example:**







Distance = 3.2 km



Base earning

\+

Additional distance earning

=

Delivery Partner Earning



The actual amounts remain configurable.







#### 15\. Multi-Seller Delivery — Map Added





For multiple sellers:







Seller A ──┐

&#x20;          │

Seller B ──┼──→ Delivery System ──→ Customer

&#x20;          │

Seller C ──┘



The delivery system can use the map/location data to determine:



* Seller locations
* Customer location
* Delivery distance
* Pickup sequence where applicable
* Delivery partner matching







Then:



Distance Earning

\+

Multi-Seller Additional Earning

=

Partner Total Earning







#### 17\. Customer Return Rule — Location Added



For returns, location information can also support return pickup.







Customer Return Request

&#x20;       ↓

3-Hour Validation

&#x20;       ↓

Return Approved

&#x20;       ↓

Return Pickup

&#x20;       ↓

Pickup Location = Customer Address

&#x20;       ↓

Delivery Partner

&#x20;       ↓

Seller







The customer's saved delivery address/location can be used for return pickup.







#### 20\. COD Architecture — Map Added





**COD flow becomes:**







Customer

&#x20;  ↓

COD Order

&#x20;  ↓

Seller

&#x20;  ↓

Ready for Pickup

&#x20;  ↓

Map-based Partner Matching

&#x20;  ↓

Delivery Partner

&#x20;  ↓

Map Tracking

&#x20;  ↓

Customer

&#x20;  ↓

Cash Collection

&#x20;  ↓

COD Record

&#x20;  ↓

Reconciliation







#### 21\. Financial Architecture — Map Connection





Delivery distance from the map system contributes to the delivery earning calculation.







MAP SERVICE

&#x20;    ↓

Distance

&#x20;    ↓

Delivery Earning Engine

&#x20;    ↓

Delivery Earning

&#x20;    ↓

Financial Transaction

&#x20;    ↓

Ledger

&#x20;    ↓

Partner Payable

&#x20;    ↓

Payout







This makes the delivery earning traceable.







#### 27\. COD Reconciliation





No major change is required, but delivery information can include:







COD Record

├── Expected amount

├── Collected amount

├── Delivery partner

├── Delivery task

├── Delivery location

├── Collection date

├── Reconciliation status

└── Difference







#### 34\. Backend Architecture — UPDATED



Remove the Prisma folder completely.



**Old**



backend/

├── prisma/

│   ├── schema.prisma

│   └── seed.js







**New**

backend/

│

├── src/

│   ├── config/

│   │

│   ├── controllers/

│   │

│   ├── routes/

│   │

│   ├── services/

│   │

│   ├── middleware/

│   │

│   ├── validators/

│   │

│   ├── utils/

│   │

│   ├── db/

│   │   ├── connection.js

│   │   ├── migrations/

│   │   └── queries/

│   │

│   ├── integrations/

│   │   ├── maps/

│   │   │   ├── geocoding.js

│   │   │   ├── places.js

│   │   │   ├── distance.js

│   │   │   └── tracking.js

│   │   │

│   │   ├── email/

│   │   ├── sms/

│   │   ├── payment/

│   │   └── payout/

│   │

│   ├── jobs/

│   │

│   └── server.js

│

├── database/

│   ├── migrations/

│   └── seeds/

│

├── tests/

│

├── package.json

└── .env







**Updated request flow**





Route

&#x20;↓

Middleware

&#x20;↓

Validator

&#x20;↓

Controller

&#x20;↓

Service

&#x20;↓

MySQL Query

&#x20;↓

MySQL





**For map operations:**



Controller

&#x20;↓

Service

&#x20;↓

Map Integration

&#x20;↓

External Map API

&#x20;↓

Result

&#x20;↓

Service

&#x20;↓

MySQL







#### 35\. Database Architecture — UPDATED



Add location entities:



User

Role

Permission

UserRole

RolePermission



CustomerProfile

SellerProfile

DeliveryPartnerProfile

AdminProfile



Address

SellerLocation

DeliveryPartnerLocation



Category

Product

ProductVariant

ProductImage

Inventory



Cart

CartItem



Order

SellerOrder

OrderItem



Payment

PaymentTransaction



DeliveryTask

DeliveryAssignment

DeliveryFee

DeliveryEarning

DeliveryEarningRule

MultiSellerDeliveryRule



Coupon

Discount

ComboOffer



ReturnRequest

ExchangeRequest

Refund



FinancialAccount

FinancialTransaction

LedgerEntry



Settlement

Payout

PayoutApproval



CODRecord

CODReconciliation



Notification

AuditLog

SecurityEvent



PlatformConfiguration







#### 37\. Frontend Architecture — UPDATED



Add map components/services.



src/

├── pages/

├── components/

│   ├── map/

│   │   ├── MapPicker

│   │   ├── LocationSearch

│   │   ├── DeliveryMap

│   │   └── TrackingMap

│   │

│   ├── address/

│   └── ...

│

├── layouts/

├── routes/

├── services/

│   ├── api/

│   └── map/

├── hooks/

├── context/

├── utils/

└── assets/





#### NEW SECTION 37A — MAP FRONTEND FEATURES





**Customer**



Address Page

&#x20;    ↓

Location Search

&#x20;    ↓

Map Picker

&#x20;    ↓

Confirm Location





**Delivery Partner**



Delivery Dashboard

&#x20;      ↓

Active Delivery

&#x20;      ↓

Map

&#x20;      ↓

Pickup Location

&#x20;      ↓

Customer Location





**Customer Tracking**



My Orders

&#x20;   ↓

Active Order

&#x20;   ↓

Track Order

&#x20;   ↓

Live/Latest Delivery Partner Location







## 40\. Final DripNow Architecture

&#x20;                        ┌─────────────────────┐

&#x20;                        │       DRIPNOW       │

&#x20;                        └──────────┬──────────┘

&#x20;                                   │

&#x20;      ┌──────────────┬─────────────┼─────────────┬──────────────┐

&#x20;      │              │             │             │              │

&#x20;      ▼              ▼             ▼             ▼              ▼

&#x20;  CUSTOMER        SELLER       DELIVERY       ADMIN       SUPER ADMIN

&#x20;                                 PARTNER

&#x20;      │              │             │             │              │

&#x20;      └──────────────┴─────────────┴─────────────┘              │

&#x20;                     │                                          │

&#x20;                     ▼                                          │

&#x20;                PRODUCT SYSTEM                                  │

&#x20;                     │                                          │

&#x20;                     ▼                                          │

&#x20;                 CART SYSTEM                                    │

&#x20;                     │                                          │

&#x20;                     ▼                                          │

&#x20;             MULTI-SELLER CHECKOUT                              │

&#x20;                     │                                          │

&#x20;                     ▼                                          │

&#x20;               PARENT ORDER                                     │

&#x20;                /        \\                                      │

&#x20;               /          \\                                     │

&#x20;       SELLER ORDER A   SELLER ORDER B                          │

&#x20;               \\          /                                     │

&#x20;                \\        /                                      │

&#x20;                 DELIVERY SYSTEM                                │

&#x20;                      │                                         │

&#x20;                      ▼                                         │

&#x20;               DELIVERY PARTNER                                 │

&#x20;                      │                                         │

&#x20;                      ▼                                         │

&#x20;                   DELIVERED                                    │

&#x20;                      │                                         │

&#x20;               ┌──────┴──────┐                                  │

&#x20;               │             │                                  │

&#x20;            3-HOUR       COMPLETE                               │

&#x20;            RETURN          │                                   │

&#x20;               │            ▼                                   │

&#x20;               │      FINANCIAL LEDGER                          │

&#x20;               │            │                                   │

&#x20;               │     ┌──────┴──────┐                            │

&#x20;               │     │             │                            │

&#x20;               │     ▼             ▼                            │

&#x20;               │ SELLER       DELIVERY                           │

&#x20;               │ PAYABLE       EARNING                           │

&#x20;               │     │             │                            │

&#x20;               │     └──────┬──────┘                            │

&#x20;               │            │                                   │

&#x20;               └────────────┼───────────────────────────────────┘

&#x20;                            ▼

&#x20;                      SUPER ADMIN

&#x20;                            │

&#x20;                  ┌─────────┴─────────┐

&#x20;                  ▼                   ▼

&#x20;            SELLER PAYOUT       DELIVERY PAYOUT







Final business rules now fixed







#### Area	                                         DripNow rule

|Seller settlement|3 hours after delivery|
|-|-|
|Customer return|Only within 3 hours|
|Late return|Blocked|
|Multi-seller delivery|Fixed/configurable additional earning|
|Delivery earning|Base 1-km amount + additional distance amount|
|Delivery payout|Partner chooses daily / weekly / monthly|
|COD|Same partner where possible; reassignment supported|

|Admin|Operational control, no money transfer|
|-|-|
|Super Admin|Financial control and payouts|
|Large payout|One Super Admin is enough|
|Seller price| Seller enters base price|
|Cart|Multi-seller cart|
|Checkout|Split into seller orders|
|Exchange|Supported|
|Refund|Supported|
|Discounts|Percentage, non-code, combo|
|Authentication|Central User + Roles + Permissions|
|Security|Backend authorization + audit trail|
|Discounts|Percentage, non-code, combo|
|Payment|Razorpay + COD|







This is the complete master plan we should follow for DripNow. 

