const fs = require('fs');
const path = require('path');

const collection = {
  info: {
    name: 'DripNow API Collection',
    description: 'Comprehensive API Collection for DripNow E-Commerce Platform. Includes Customer, Seller, Delivery, Admin, Finance, Cart, Product, Maps, and Auth APIs.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: []
};

function buildUrl(rawUrl, queryParams = []) {
  const urlObj = new URL(rawUrl.replace(/\{\{base_url\}\}/, 'http://localhost:5000'));
  const pathSegments = urlObj.pathname.split('/').filter(p => p.length > 0);
  
  const result = {
    raw: rawUrl,
    host: ['{{base_url}}'],
    path: pathSegments
  };

  if (queryParams.length > 0) {
    result.query = queryParams.map(q => ({
      key: q.key,
      value: q.value || '',
      description: q.description || ''
    }));
  }

  return result;
}

function buildHeaders(includeAuth = true, extraHeaders = []) {
  const headers = [
    { key: 'Content-Type', value: 'application/json', type: 'text' }
  ];
  if (includeAuth) {
    headers.unshift({ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' });
  }
  return [...headers, ...extraHeaders];
}

function buildRequest(name, method, url, body = null, includeAuth = true, queryParams = [], extraHeaders = [], testScript = null) {
  const reqObj = {
    name: `${method} ${name}`,
    request: {
      method: method,
      header: buildHeaders(includeAuth, extraHeaders),
      url: buildUrl(url, queryParams)
    },
    response: []
  };

  if (body) {
    reqObj.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: {
        raw: {
          language: 'json'
        }
      }
    };
  }

  if (testScript) {
    reqObj.event = [
      {
        listen: 'test',
        script: {
          exec: testScript.split('\n'),
          type: 'text/javascript'
        }
      }
    ];
  }

  return reqObj;
}

// ─── 1. System & Health ───────────────────────────────────────────────────────
const systemFolder = {
  name: '1. System & Health',
  item: [
    buildRequest('/health', 'GET', '{{base_url}}/health', null, false)
  ]
};

// ─── 2. Authentication ───────────────────────────────────────────────────────
const authFolder = {
  name: '2. Authentication',
  item: [
    buildRequest('Send Phone OTP (Pre-Reg)', 'POST', '{{base_url}}/api/auth/register/send-phone-otp', { phone: '+919876543210' }, false),
    buildRequest('Verify Phone OTP (Pre-Reg)', 'POST', '{{base_url}}/api/auth/register/verify-phone-otp', { phone: '+919876543210', otp: '123456' }, false),
    buildRequest('Send Email OTP (Pre-Reg)', 'POST', '{{base_url}}/api/auth/register/send-email-otp', { email: 'user@example.com' }, false),
    buildRequest('Verify Email OTP (Pre-Reg)', 'POST', '{{base_url}}/api/auth/register/verify-email-otp', { email: 'user@example.com', otp: '123456' }, false),
    buildRequest('Check Username Availability', 'POST', '{{base_url}}/api/auth/check-username', { username: 'johndoe' }, false),
    buildRequest('Register Customer Account', 'POST', '{{base_url}}/api/auth/register', {
      full_name: 'John Doe',
      email: 'user@example.com',
      phone: '+919876543210',
      username: 'johndoe',
      password: 'Password123!',
      email_proof_token: 'proof_token_email_123',
      phone_proof_token: 'proof_token_phone_123'
    }, false),
    buildRequest('Register Seller Account', 'POST', '{{base_url}}/api/auth/register/seller', {
      full_name: 'Seller Master',
      email: 'seller@example.com',
      phone: '+919876543211',
      username: 'selleruser',
      password: 'Password123!',
      business_name: 'Acme Fashion Store'
    }, false),
    buildRequest('Register Delivery Partner Account', 'POST', '{{base_url}}/api/auth/register/delivery', {
      full_name: 'Delivery Partner',
      email: 'delivery@example.com',
      phone: '+919876543212',
      username: 'deliveryuser',
      password: 'Password123!'
    }, false),
    buildRequest('Login with Email', 'POST', '{{base_url}}/api/auth/login/email', {
      email: 'user@example.com',
      password: 'Password123!'
    }, false, [], [], `var jsonData = pm.response.json();
if (jsonData.data && jsonData.data.token) {
    pm.environment.set("token", jsonData.data.token);
    if (jsonData.data.refreshToken) {
        pm.environment.set("refresh_token", jsonData.data.refreshToken);
    }
}`),
    buildRequest('Login with Phone (Request OTP)', 'POST', '{{base_url}}/api/auth/login/phone', { phone: '+919876543210' }, false),
    buildRequest('Verify Phone Login OTP', 'POST', '{{base_url}}/api/auth/verify-phone-otp', { phone: '+919876543210', otp: '123456' }, false, [], [], `var jsonData = pm.response.json();
if (jsonData.data && jsonData.data.token) {
    pm.environment.set("token", jsonData.data.token);
}`),
    buildRequest('Resend Phone OTP', 'POST', '{{base_url}}/api/auth/resend-phone-otp', { phone: '+919876543210' }, false),
    buildRequest('Verify Email Token', 'POST', '{{base_url}}/api/auth/verify-email', { token: 'sample_verification_token' }, false),
    buildRequest('Forgot Password - Send OTP', 'POST', '{{base_url}}/api/auth/forgot-password/send-otp', { email: 'user@example.com' }, false),
    buildRequest('Forgot Password - Verify OTP', 'POST', '{{base_url}}/api/auth/forgot-password/verify-otp', { email: 'user@example.com', otp: '123456' }, false),
    buildRequest('Forgot Password - Reset Password', 'POST', '{{base_url}}/api/auth/forgot-password/reset', { token: 'reset_proof_token', new_password: 'NewPassword123!' }, false),
    buildRequest('Refresh Access Token', 'POST', '{{base_url}}/api/auth/refresh', { refresh_token: '{{refresh_token}}' }, false, [], [], `var jsonData = pm.response.json();
if (jsonData.data && jsonData.data.token) {
    pm.environment.set("token", jsonData.data.token);
}`),
    buildRequest('Get My User Profile', 'GET', '{{base_url}}/api/auth/me', null, true),
    buildRequest('Logout Current Device', 'POST', '{{base_url}}/api/auth/logout', null, true),
    buildRequest('Logout All Devices', 'POST', '{{base_url}}/api/auth/logout-all', null, true)
  ]
};

// ─── 3. Customer Profile & Addresses ──────────────────────────────────────────
const customerFolder = {
  name: '3. Customer Profile & Addresses',
  item: [
    buildRequest('Get Customer Profile', 'GET', '{{base_url}}/api/v1/customer/profile', null, true),
    buildRequest('Update Customer Profile', 'PUT', '{{base_url}}/api/v1/customer/profile', {
      full_name: 'Johnathan Doe',
      avatar_url: 'https://example.com/avatars/johndoe.png'
    }, true),
    buildRequest('List Delivery Addresses', 'GET', '{{base_url}}/api/v1/customer/addresses', null, true),
    buildRequest('Add Delivery Address', 'POST', '{{base_url}}/api/v1/customer/addresses', {
      name: 'Home',
      address_line1: '123 Main Street',
      address_line2: 'Apartment 4B',
      city: 'Bangalore',
      state: 'Karnataka',
      postal_code: '560001',
      latitude: 12.9716,
      longitude: 77.5946,
      is_default: true
    }, true),
    buildRequest('Update Delivery Address', 'PUT', '{{base_url}}/api/v1/customer/addresses/:id', {
      name: 'Office',
      address_line1: '456 Innovation Park',
      address_line2: 'Tower B, 3rd Floor',
      city: 'Bangalore',
      state: 'Karnataka',
      postal_code: '560100',
      latitude: 12.9352,
      longitude: 77.6245
    }, true),
    buildRequest('Delete Delivery Address', 'DELETE', '{{base_url}}/api/v1/customer/addresses/:id', null, true),
    buildRequest('Set Default Address', 'PATCH', '{{base_url}}/api/v1/customer/addresses/:id/default', null, true),
    buildRequest('Get Wishlist', 'GET', '{{base_url}}/api/v1/customer/wishlist', null, true),
    buildRequest('Add to Wishlist', 'POST', '{{base_url}}/api/v1/customer/wishlist', { product_id: '{{product_id}}' }, true),
    buildRequest('Remove from Wishlist', 'DELETE', '{{base_url}}/api/v1/customer/wishlist/:productId', null, true)
  ]
};

// ─── 4. Maps & Location Services ──────────────────────────────────────────────
const mapsFolder = {
  name: '4. Maps & Location Services',
  item: [
    buildRequest('Search Places / Autocomplete', 'GET', '{{base_url}}/api/v1/maps/search', null, false, [
      { key: 'q', value: 'Koramangala Bangalore', description: 'Location search query' }
    ]),
    buildRequest('Reverse Geocode Coordinates', 'GET', '{{base_url}}/api/v1/maps/reverse-geocode', null, false, [
      { key: 'lat', value: '12.9716', description: 'Latitude' },
      { key: 'lng', value: '77.5946', description: 'Longitude' }
    ]),
    buildRequest('Calculate Distance & Delivery Fee', 'POST', '{{base_url}}/api/v1/maps/distance', {
      origin: { lat: 12.9716, lng: 77.5946 },
      destination: { lat: 12.9352, lng: 77.6245 }
    }, false)
  ]
};

// ─── 5. Products & Categories ──────────────────────────────────────────────────
const productFolder = {
  name: '5. Products & Categories',
  item: [
    buildRequest('List Categories', 'GET', '{{base_url}}/api/v1/products/categories', null, false),
    buildRequest('Create Category (Admin)', 'POST', '{{base_url}}/api/v1/products/categories', {
      name: 'Streetwear & Hoodies',
      slug: 'streetwear-hoodies',
      parent_id: null
    }, true),
    buildRequest('Get Public Products Catalogue', 'GET', '{{base_url}}/api/v1/products', null, false, [
      { key: 'category', value: 'streetwear-hoodies', description: 'Category slug' },
      { key: 'q', value: 'over-sized hoodie', description: 'Search query' },
      { key: 'page', value: '1', description: 'Page number' },
      { key: 'limit', value: '20', description: 'Items per page' }
    ]),
    buildRequest('Get Product Details by ID', 'GET', '{{base_url}}/api/v1/products/:id', null, false),
    buildRequest('Get Seller Products (My Inventory)', 'GET', '{{base_url}}/api/v1/products/seller/my', null, true),
    buildRequest('Create Product (Seller)', 'POST', '{{base_url}}/api/v1/products', {
      title: 'Heavyweight Oversized Hoodie',
      description: '100% Organic Cotton 450GSM Fleece Hoodie',
      category_id: '{{category_id}}',
      brand: 'DripWear',
      base_price: 3499
    }, true),
    buildRequest('Update Product (Seller)', 'PUT', '{{base_url}}/api/v1/products/:id', {
      title: 'Premium Heavyweight Oversized Hoodie',
      description: 'Updated 500GSM Luxury Cotton Fleece Hoodie',
      base_price: 3999
    }, true),
    buildRequest('Delete Product (Seller)', 'DELETE', '{{base_url}}/api/v1/products/:id', null, true),
    buildRequest('Add Product Variant (Seller)', 'POST', '{{base_url}}/api/v1/products/:id/variants', {
      sku: 'HOOD-BLK-L',
      name: 'Black / Large',
      price: 3999,
      stock_quantity: 50,
      attributes: { color: 'Black', size: 'L' }
    }, true),
    buildRequest('Update Variant Inventory (Seller)', 'PUT', '{{base_url}}/api/v1/products/variants/:variantId/inventory', {
      quantity: 120
    }, true),
    buildRequest('Add Product Image (Seller)', 'POST', '{{base_url}}/api/v1/products/:id/images', {
      image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2',
      is_primary: true
    }, true)
  ]
};

// ─── 6. Offers & Coupons ───────────────────────────────────────────────────────
const offerFolder = {
  name: '6. Offers & Coupons',
  item: [
    buildRequest('Get Offer Details by Coupon Code', 'GET', '{{base_url}}/api/v1/offers/code/:code', null, false),
    buildRequest('List Seller Offers', 'GET', '{{base_url}}/api/v1/offers/seller', null, true),
    buildRequest('Create Seller Offer / Coupon', 'POST', '{{base_url}}/api/v1/offers', {
      code: 'DRIP20',
      discount_percentage: 20,
      max_discount: 500,
      min_order_value: 1499,
      expires_at: '2026-12-31T23:59:59Z'
    }, true),
    buildRequest('List Seller Combo Offers', 'GET', '{{base_url}}/api/v1/offers/combo/seller', null, true),
    buildRequest('Create Seller Combo Offer Bundle', 'POST', '{{base_url}}/api/v1/offers/combo', {
      title: 'Summer Outfit Bundle',
      discount_percentage: 25,
      items: [
        { product_id: '{{product_id}}', quantity: 1 }
      ]
    }, true)
  ]
};

// ─── 7. Shopping Cart ─────────────────────────────────────────────────────────
const cartFolder = {
  name: '7. Shopping Cart',
  item: [
    buildRequest('Get Current Cart', 'GET', '{{base_url}}/api/v1/cart', null, true),
    buildRequest('Add Item to Cart', 'POST', '{{base_url}}/api/v1/cart', {
      product_id: '{{product_id}}',
      variant_id: '{{variant_id}}',
      quantity: 2
    }, true),
    buildRequest('Update Cart Item Quantity', 'PUT', '{{base_url}}/api/v1/cart/:itemId', {
      quantity: 3
    }, true),
    buildRequest('Clear Entire Cart', 'DELETE', '{{base_url}}/api/v1/cart', null, true)
  ]
};

// ─── 8. Orders & Order Requests ───────────────────────────────────────────────
const orderFolder = {
  name: '8. Customer Orders & Returns',
  item: [
    buildRequest('Get Checkout Price Quote', 'POST', '{{base_url}}/api/v1/orders/quote', {
      address_id: '{{address_id}}',
      payment_method: 'cod',
      coupon_code: 'DRIP20'
    }, true),
    buildRequest('Place New Order / Checkout', 'POST', '{{base_url}}/api/v1/orders/checkout', {
      address_id: '{{address_id}}',
      payment_method: 'razorpay',
      coupon_code: 'DRIP20'
    }, true),
    buildRequest('List Customer Orders', 'GET', '{{base_url}}/api/v1/orders', null, true),
    buildRequest('Get Order Details', 'GET', '{{base_url}}/api/v1/orders/:orderId', null, true),
    buildRequest('Cancel Order', 'POST', '{{base_url}}/api/v1/orders/:orderId/cancel', {
      reason: 'Order placed by mistake'
    }, true),
    buildRequest('Get Order Return/Exchange Requests', 'GET', '{{base_url}}/api/v1/orders/:id/requests', null, true),
    buildRequest('Create Return Request', 'POST', '{{base_url}}/api/v1/orders/:id/requests', {
      kind: 'RETURN',
      reason: 'Size did not fit as expected and fabric feel differed from description'
    }, true),
    buildRequest('Create Exchange Request', 'POST', '{{base_url}}/api/v1/orders/:id/requests', {
      kind: 'EXCHANGE',
      reason: 'Need larger size',
      order_item_id: '{{item_id}}',
      requested_variant_id: '{{variant_id}}',
      quantity: 1
    }, true)
  ]
};

// ─── 9. Payments & Webhooks ────────────────────────────────────────────────────
const paymentFolder = {
  name: '9. Payments & Webhooks',
  item: [
    buildRequest('Initiate Razorpay Order Payment', 'POST', '{{base_url}}/api/v1/payments/orders/:orderId', null, true),
    buildRequest('Verify Razorpay Payment Signature', 'POST', '{{base_url}}/api/v1/payments/verify', {
      order_id: '{{order_id}}',
      razorpay_payment_id: 'pay_LMN123456789',
      razorpay_signature: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    }, true),
    buildRequest('Razorpay Payment Webhook', 'POST', '{{base_url}}/api/v1/payments/webhook', {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_LMN123456789',
            order_id: 'order_ABC123456789',
            status: 'captured',
            currency: 'INR',
            amount: 399900
          }
        }
      }
    }, false, [], [
      { key: 'X-Razorpay-Signature', value: 'sample_webhook_signature_hash', type: 'text' },
      { key: 'X-Razorpay-Event-Id', value: 'evt_sample_123456', type: 'text' }
    ])
  ]
};

// ─── 10. Seller Store & Dashboard ─────────────────────────────────────────────
const sellerFolder = {
  name: '10. Seller Profile & Store',
  item: [
    buildRequest('Register / Submit Seller Application', 'POST', '{{base_url}}/api/v1/seller/register', {
      business_name: 'Urban Drip Apparel',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bank_account_number: '987654321012',
      ifsc_code: 'SBIN0001234'
    }, true),
    buildRequest('Get My Seller Profile', 'GET', '{{base_url}}/api/v1/seller/profile', null, true),
    buildRequest('Update Seller Profile', 'PUT', '{{base_url}}/api/v1/seller/profile', {
      business_name: 'Urban Drip Apparel Ltd',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bank_account_number: '987654321012',
      ifsc_code: 'SBIN0001234'
    }, true),
    buildRequest('Upload Seller Document', 'POST', '{{base_url}}/api/v1/seller/documents', {
      document_type: 'GST_CERTIFICATE',
      document_url: 'https://example.com/documents/gst.pdf'
    }, true),
    buildRequest('Update Store Physical Location', 'PUT', '{{base_url}}/api/v1/seller/location', {
      address_line1: '100 Commercial Street',
      city: 'Bangalore',
      state: 'Karnataka',
      postal_code: '560001',
      latitude: 12.975,
      longitude: 77.605
    }, true),
    buildRequest('Get Seller Dashboard Overview', 'GET', '{{base_url}}/api/v1/seller/dashboard', null, true),
    buildRequest('Get Seller Earnings & Settlements', 'GET', '{{base_url}}/api/v1/seller/earnings', null, true)
  ]
};

// ─── 11. Seller Orders ────────────────────────────────────────────────────────
const sellerOrderFolder = {
  name: '11. Seller Orders Management',
  item: [
    buildRequest('List Seller Orders', 'GET', '{{base_url}}/api/v1/seller/orders', null, true, [
      { key: 'status', value: 'accepted', description: 'Filter by order status' }
    ]),
    buildRequest('List Return Requests for Seller Orders', 'GET', '{{base_url}}/api/v1/seller/orders/returns/requests', null, true),
    buildRequest('Get Seller Order Details', 'GET', '{{base_url}}/api/v1/seller/orders/:id', null, true),
    buildRequest('Update Seller Order Status', 'PATCH', '{{base_url}}/api/v1/seller/orders/:id/status', {
      status: 'accepted'
    }, true)
  ]
};

// ─── 12. Delivery Partner API ─────────────────────────────────────────────────
const deliveryFolder = {
  name: '12. Delivery Partner Services',
  item: [
    buildRequest('Track Customer Order Status', 'GET', '{{base_url}}/api/v1/delivery/tracking/:orderId', null, true),
    buildRequest('Get Delivery Partner Profile', 'GET', '{{base_url}}/api/v1/delivery/profile', null, true),
    buildRequest('Submit Delivery Partner Profile', 'POST', '{{base_url}}/api/v1/delivery/profile', {
      vehicle_type: 'motorcycle',
      license_number: 'KA0120230009988',
      documents: ['https://example.com/docs/license.pdf']
    }, true),
    buildRequest('Update Availability (Online/Offline)', 'PATCH', '{{base_url}}/api/v1/delivery/availability', {
      available: true
    }, true),
    buildRequest('Get Current Partner Location', 'GET', '{{base_url}}/api/v1/delivery/location', null, true),
    buildRequest('Update GPS Location', 'PUT', '{{base_url}}/api/v1/delivery/location', {
      latitude: 12.9716,
      longitude: 77.5946
    }, true),
    buildRequest('Get Available Delivery Tasks', 'GET', '{{base_url}}/api/v1/delivery/tasks/available', null, true),
    buildRequest('Get Available Reverse Tasks (Return/Exchange)', 'GET', '{{base_url}}/api/v1/delivery/reverse-tasks/available', null, true),
    buildRequest('List My Assigned Reverse Tasks', 'GET', '{{base_url}}/api/v1/delivery/reverse-tasks', null, true),
    buildRequest('Accept Reverse Task', 'POST', '{{base_url}}/api/v1/delivery/reverse-tasks/:id/accept', null, true),
    buildRequest('Update Reverse Task Status', 'PATCH', '{{base_url}}/api/v1/delivery/reverse-tasks/:id/status', {
      status: 'PICKED_UP'
    }, true),
    buildRequest('List My Active Delivery Tasks', 'GET', '{{base_url}}/api/v1/delivery/tasks', null, true),
    buildRequest('Get Total Delivery Earnings', 'GET', '{{base_url}}/api/v1/delivery/earnings', null, true),
    buildRequest('Accept Delivery Task', 'POST', '{{base_url}}/api/v1/delivery/tasks/:id/accept', null, true),
    buildRequest('Update Delivery Task Status', 'PATCH', '{{base_url}}/api/v1/delivery/tasks/:id/status', {
      status: 'DELIVERED',
      cash_paise: 0
    }, true)
  ]
};

// ─── 13. Finance & Treasury ───────────────────────────────────────────────────
const financeFolder = {
  name: '13. Finance & Treasury (Admin)',
  item: [
    buildRequest('Get Platform Financial Balances', 'GET', '{{base_url}}/api/v1/finance/accounts', null, true),
    buildRequest('List Financial Transactions', 'GET', '{{base_url}}/api/v1/finance/transactions', null, true),
    buildRequest('List Double-Entry Ledger Entries', 'GET', '{{base_url}}/api/v1/finance/ledger', null, true),
    buildRequest('List Seller Settlements', 'GET', '{{base_url}}/api/v1/finance/settlements', null, true),
    buildRequest('List Payout Records', 'GET', '{{base_url}}/api/v1/finance/payouts', null, true),
    buildRequest('Get Financial Summary Reports', 'GET', '{{base_url}}/api/v1/finance/reports', null, true),
    buildRequest('Get Delivery Earning Rules', 'GET', '{{base_url}}/api/v1/finance/earning-rules', null, true),
    buildRequest('Create Delivery Earning Rule (Super Admin)', 'POST', '{{base_url}}/api/v1/finance/earning-rules', {
      base_distance_km: 3,
      base_amount_paise: 3500,
      additional_distance_unit_km: 1,
      additional_amount_paise: 1200,
      multi_seller_addition_paise: 1500
    }, true),
    buildRequest('Initiate Payout (Super Admin)', 'POST', '{{base_url}}/api/v1/finance/payouts', {
      beneficiary_type: 'SELLER',
      beneficiary_id: '{{seller_id}}',
      settlement_ids: ['{{settlement_id}}']
    }, true),
    buildRequest('Approve Payout (Super Admin)', 'POST', '{{base_url}}/api/v1/finance/payouts/:id/approve', {
      note: 'Verified seller settlement calculation'
    }, true),
    buildRequest('Execute Payout Transfer (Super Admin)', 'POST', '{{base_url}}/api/v1/finance/payouts/:id/execute', {
      manual_reference: 'BANK_IMPS_REF_998877'
    }, true)
  ]
};

// ─── 14. Notifications ───────────────────────────────────────────────────────
const notificationFolder = {
  name: '14. User Notifications',
  item: [
    buildRequest('Get User Notifications', 'GET', '{{base_url}}/api/v1/notifications', null, true),
    buildRequest('Mark Notification as Read', 'PATCH', '{{base_url}}/api/v1/notifications/:id/read', null, true),
    buildRequest('Register Push Notification Device', 'POST', '{{base_url}}/api/v1/notifications/devices', {
      provider: 'fcm',
      token: 'sample_fcm_token_string_1234567890_abcdefghijklmnopqrstuvwxyz'
    }, true),
    buildRequest('Unregister Push Notification Device', 'DELETE', '{{base_url}}/api/v1/notifications/devices/:token', null, true)
  ]
};

// ─── 15. Admin - Seller Applications ──────────────────────────────────────────
const adminSellerFolder = {
  name: '15. Admin - Seller Applications',
  item: [
    buildRequest('List Seller Applications', 'GET', '{{base_url}}/api/v1/admin/sellers', null, true, [
      { key: 'status', value: 'pending', description: 'Filter by status: pending | approved | rejected | suspended' }
    ]),
    buildRequest('Get Seller Application Details', 'GET', '{{base_url}}/api/v1/admin/sellers/:id', null, true),
    buildRequest('Approve Seller Application', 'POST', '{{base_url}}/api/v1/admin/sellers/:id/approve', null, true),
    buildRequest('Reject Seller Application', 'POST', '{{base_url}}/api/v1/admin/sellers/:id/reject', {
      reason: 'GSTIN document provided is invalid or blurred'
    }, true),
    buildRequest('Suspend Seller Application', 'POST', '{{base_url}}/api/v1/admin/sellers/:id/suspend', {
      reason: 'Counterfeit product reports received'
    }, true)
  ]
};

// ─── 16. Admin - Delivery Partners ────────────────────────────────────────────
const adminDeliveryFolder = {
  name: '16. Admin - Delivery Partners',
  item: [
    buildRequest('List Delivery Partner Applications', 'GET', '{{base_url}}/api/v1/admin/delivery/partners', null, true),
    buildRequest('Review Delivery Partner Application', 'PATCH', '{{base_url}}/api/v1/admin/delivery/partners/:id', {
      status: 'APPROVED',
      reason: 'Driver license and background check verified'
    }, true),
    buildRequest('List COD Collections', 'GET', '{{base_url}}/api/v1/admin/delivery/cod', null, true),
    buildRequest('Reconcile COD Cash Deposit (Super Admin)', 'POST', '{{base_url}}/api/v1/admin/delivery/cod/:id/reconcile', {
      reference: 'BANK_DEPOSIT_SLIP_443322'
    }, true)
  ]
};

// ─── 17. Admin - Order Requests & Refunds ─────────────────────────────────────
const adminOrderRequestFolder = {
  name: '17. Admin - Returns & Refunds',
  item: [
    buildRequest('List All Return/Exchange Requests', 'GET', '{{base_url}}/api/v1/admin/order-requests', null, true),
    buildRequest('Review Return/Exchange Request', 'PATCH', '{{base_url}}/api/v1/admin/order-requests/:id', {
      action: 'APPROVE',
      note: 'Customer provided proof of defective item'
    }, true),
    buildRequest('Update Reverse Fulfillment Status', 'PATCH', '{{base_url}}/api/v1/admin/order-requests/:id/fulfillment', {
      action: 'PICKUP_COMPLETED',
      note: 'Item picked up and inspected by warehouse manager'
    }, true),
    buildRequest('Reconcile Refund (Super Admin)', 'POST', '{{base_url}}/api/v1/admin/order-requests/:id/refund', {
      reference: 'rfnd_razorpay_reference_990011'
    }, true)
  ]
};

// ─── 18. Admin - Security & Platform Settings ─────────────────────────────────
const adminSecurityFolder = {
  name: '18. Admin - Security & Settings',
  item: [
    buildRequest('List Users (Admin)', 'GET', '{{base_url}}/api/v1/admin/users', null, true),
    buildRequest('List Platform Orders (Admin)', 'GET', '{{base_url}}/api/v1/admin/orders', null, true),
    buildRequest('List Audit Logs', 'GET', '{{base_url}}/api/v1/admin/audit', null, true),
    buildRequest('List Security Events', 'GET', '{{base_url}}/api/v1/admin/security-events', null, true),
    buildRequest('List Products for Moderation', 'GET', '{{base_url}}/api/v1/admin/products', null, true),
    buildRequest('Moderate Product Status', 'PATCH', '{{base_url}}/api/v1/admin/products/:id/moderation', {
      status: 'APPROVED',
      note: 'Product imagery and description verified'
    }, true),
    buildRequest('List Platform Offers', 'GET', '{{base_url}}/api/v1/admin/platform-offers', null, true),
    buildRequest('Create Platform Offer (Super Admin)', 'POST', '{{base_url}}/api/v1/admin/platform-offers', {
      name: 'Grand Festive Sale',
      code: 'FESTIVE500',
      offer_type: 'flat',
      discount_value: 500,
      min_order_value: 2500
    }, true),
    buildRequest('Toggle Platform Offer Active Status', 'PATCH', '{{base_url}}/api/v1/admin/platform-offers/:id', {
      is_active: true
    }, true),
    buildRequest('Update User Account Status', 'PATCH', '{{base_url}}/api/v1/admin/users/:id/status', {
      status: 'APPROVED',
      reason: 'Identity verification completed'
    }, true),
    buildRequest('List Admin Creation Requests', 'GET', '{{base_url}}/api/v1/admin/admin-requests', null, true),
    buildRequest('Request Admin Role Elevation', 'POST', '{{base_url}}/api/v1/admin/admin-requests', {
      user_id: '{{target_user_id}}'
    }, true),
    buildRequest('Approve Admin Creation Request', 'POST', '{{base_url}}/api/v1/admin/admin-requests/:id/approve', null, true),
    buildRequest('Get Platform Global Settings (Super Admin)', 'GET', '{{base_url}}/api/v1/admin/settings', null, true),
    buildRequest('Update Platform Global Settings (Super Admin)', 'PATCH', '{{base_url}}/api/v1/admin/settings', {
      delivery_base_paise: 4000,
      platform_fee_paise: 500,
      matching_radius_km: 15
    }, true)
  ]
};

// Assemble Collection
collection.item = [
  systemFolder,
  authFolder,
  customerFolder,
  mapsFolder,
  productFolder,
  offerFolder,
  cartFolder,
  orderFolder,
  paymentFolder,
  sellerFolder,
  sellerOrderFolder,
  deliveryFolder,
  financeFolder,
  notificationFolder,
  adminSellerFolder,
  adminDeliveryFolder,
  adminOrderRequestFolder,
  adminSecurityFolder
];

// Write Collection File
const collectionPath = path.join(__dirname, 'DripNow_Postman_Collection.json');
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log(`✅ Postman Collection generated successfully at: ${collectionPath}`);

// Environment file construction
const environment = {
  id: 'dripnow-env-local',
  name: 'DripNow Local Environment',
  values: [
    { key: 'base_url', value: 'http://localhost:5000', type: 'default', enabled: true },
    { key: 'token', value: '', type: 'secret', enabled: true },
    { key: 'refresh_token', value: '', type: 'secret', enabled: true },
    { key: 'customer_token', value: '', type: 'secret', enabled: true },
    { key: 'seller_token', value: '', type: 'secret', enabled: true },
    { key: 'delivery_token', value: '', type: 'secret', enabled: true },
    { key: 'admin_token', value: '', type: 'secret', enabled: true },
    { key: 'product_id', value: '11111111-1111-1111-1111-111111111111', type: 'default', enabled: true },
    { key: 'variant_id', value: '22222222-2222-2222-2222-222222222222', type: 'default', enabled: true },
    { key: 'category_id', value: '33333333-3333-3333-3333-333333333333', type: 'default', enabled: true },
    { key: 'address_id', value: '44444444-4444-4444-4444-444444444444', type: 'default', enabled: true },
    { key: 'order_id', value: '55555555-5555-5555-5555-555555555555', type: 'default', enabled: true },
    { key: 'seller_id', value: '66666666-6666-6666-6666-666666666666', type: 'default', enabled: true },
    { key: 'item_id', value: '77777777-7777-7777-7777-777777777777', type: 'default', enabled: true },
    { key: 'target_user_id', value: '88888888-8888-8888-8888-888888888888', type: 'default', enabled: true },
    { key: 'settlement_id', value: '99999999-9999-9999-9999-999999999999', type: 'default', enabled: true }
  ],
  _postman_variable_scope: 'environment'
};

const envPath = path.join(__dirname, 'DripNow_Postman_Environment.json');
fs.writeFileSync(envPath, JSON.stringify(environment, null, 2));
console.log(`✅ Postman Environment generated successfully at: ${envPath}`);
