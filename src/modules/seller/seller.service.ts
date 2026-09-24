import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import {
  CreateSellerDTO,
  UpdateSellerDTO,
  SellerProfile,
  SellerDocument,
  SellerLocation,
  SellerDashboardOverview,
  SellerDocumentType,
} from './seller.types';

export async function createOrUpdateSellerProfile(userId: string, data: CreateSellerDTO): Promise<SellerProfile> {
  const existing = await db('seller_profiles').where({ user_id: userId }).first();

  let sellerId: string;

  if (existing) {
    sellerId = existing.id;
    await db('seller_profiles')
      .where({ id: sellerId })
      .update({
        business_name: data.business_name,
        business_type: data.business_type ?? existing.business_type,
        gstin: data.gstin ?? existing.gstin,
        pan: data.pan ?? existing.pan,
        bank_account_number: data.bank_account_number ?? existing.bank_account_number,
        bank_ifsc: data.bank_ifsc ?? existing.bank_ifsc,
        bank_name: data.bank_name ?? existing.bank_name,
        status: 'pending',
        updated_at: db.fn.now(),
      });
  } else {
    sellerId = uuidv4();
    await db('seller_profiles').insert({
      id: sellerId,
      user_id: userId,
      business_name: data.business_name,
      business_type: data.business_type,
      gstin: data.gstin,
      pan: data.pan,
      bank_account_number: data.bank_account_number,
      bank_ifsc: data.bank_ifsc,
      bank_name: data.bank_name,
      status: 'pending',
    });
  }

  // Also sync onboarding_applications table if present
  const existingApp = await db('onboarding_applications')
    .where({ user_id: userId, role_applied: 'seller' })
    .first();

  if (!existingApp) {
    await db('onboarding_applications').insert({
      user_id: userId,
      role_applied: 'seller',
      status: 'pending',
      business_name: data.business_name,
      business_type: data.business_type,
      address: data.location ? `${data.location.address_line1}, ${data.location.city}, ${data.location.state}` : null,
      documents_json: data.documents ? JSON.stringify(data.documents) : null,
    });
  } else {
    await db('onboarding_applications')
      .where({ id: existingApp.id })
      .update({
        status: 'pending',
        business_name: data.business_name,
        business_type: data.business_type ?? existingApp.business_type,
        address: data.location ? `${data.location.address_line1}, ${data.location.city}, ${data.location.state}` : existingApp.address,
        documents_json: data.documents ? JSON.stringify(data.documents) : existingApp.documents_json,
        updated_at: db.fn.now(),
      });
  }

  // Add location if provided
  if (data.location) {
    await addOrUpdateSellerLocation(sellerId, data.location);
  }

  // Add documents if provided
  if (data.documents && data.documents.length > 0) {
    for (const doc of data.documents) {
      await addSellerDocument(sellerId, doc.document_type, doc.document_url);
    }
  }

  return getSellerProfileById(sellerId);
}

export async function getSellerProfileByUserId(userId: string): Promise<SellerProfile | null> {
  const profile = await db('seller_profiles').where({ user_id: userId }).first();
  return profile ?? null;
}

export async function getSellerProfileById(sellerId: string): Promise<SellerProfile> {
  const profile = await db('seller_profiles').where({ id: sellerId }).first();
  if (!profile) {
    throw new Error('Seller profile not found');
  }
  return profile;
}

export async function updateSellerProfile(sellerId: string, data: UpdateSellerDTO): Promise<SellerProfile> {
  await db('seller_profiles')
    .where({ id: sellerId })
    .update({
      ...data,
      updated_at: db.fn.now(),
    });

  return getSellerProfileById(sellerId);
}

export async function addSellerDocument(
  sellerId: string,
  documentType: SellerDocumentType,
  documentUrl: string
): Promise<SellerDocument> {
  const docId = uuidv4();
  await db('seller_documents').insert({
    id: docId,
    seller_id: sellerId,
    document_type: documentType,
    document_url: documentUrl,
    status: 'pending',
  });

  return db('seller_documents').where({ id: docId }).first();
}

export async function getSellerDocuments(sellerId: string): Promise<SellerDocument[]> {
  return db('seller_documents').where({ seller_id: sellerId });
}

export async function addOrUpdateSellerLocation(
  sellerId: string,
  locationData: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<SellerLocation> {
  const existingLoc = await db('seller_locations').where({ seller_id: sellerId }).first();

  if (existingLoc) {
    await db('seller_locations')
      .where({ id: existingLoc.id })
      .update({
        ...locationData,
        updated_at: db.fn.now(),
      });
    return db('seller_locations').where({ id: existingLoc.id }).first();
  }

  const locId = uuidv4();
  await db('seller_locations').insert({
    id: locId,
    seller_id: sellerId,
    ...locationData,
  });

  return db('seller_locations').where({ id: locId }).first();
}

export async function getSellerLocation(sellerId: string): Promise<SellerLocation | null> {
  const loc = await db('seller_locations').where({ seller_id: sellerId }).first();
  return loc ?? null;
}

export async function getSellerDashboardOverview(sellerId: string): Promise<SellerDashboardOverview> {
  const profile = await getSellerProfileById(sellerId);

  // 1. Total products count
  const productsCountRes = await db('products')
    .where({ seller_id: sellerId })
    .count({ count: '*' })
    .first();
  const totalProducts = Number(productsCountRes?.count ?? 0);

  // 2. Low stock products count
  const lowStockRes = await db('inventory')
    .join('product_variants', 'inventory.variant_id', 'product_variants.id')
    .join('products', 'product_variants.product_id', 'products.id')
    .where('products.seller_id', sellerId)
    .whereRaw('inventory.quantity <= inventory.low_stock_threshold')
    .count({ count: '*' })
    .first();
  const lowStockCount = Number(lowStockRes?.count ?? 0);

  // 3. Pending & total orders count
  const pendingOrdersRes = await db('seller_orders')
    .where({ seller_id: sellerId })
    .whereIn('status', ['new', 'accepted', 'preparing'])
    .count({ count: '*' })
    .first();
  const pendingOrdersCount = Number(pendingOrdersRes?.count ?? 0);

  const totalOrdersRes = await db('seller_orders')
    .where({ seller_id: sellerId })
    .count({ count: '*' })
    .first();
  const totalOrdersCount = Number(totalOrdersRes?.count ?? 0);

  // 4. Total earnings
  const earningsRes = await db('seller_orders')
    .where({ seller_id: sellerId, status: 'completed' })
    .sum({ total: 'total_amount' })
    .first();
  const totalEarnings = Number(earningsRes?.total ?? 0);

  return {
    seller_id: sellerId,
    business_name: profile.business_name,
    status: profile.status,
    total_products: totalProducts,
    low_stock_products_count: lowStockCount,
    pending_orders_count: pendingOrdersCount,
    total_orders_count: totalOrdersCount,
    total_earnings: totalEarnings,
  };
}
