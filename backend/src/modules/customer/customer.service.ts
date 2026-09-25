import { fail } from '../../utils/httpError';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import { getProductById } from '../product/product.service';
import {
  CustomerAddress,
  CreateAddressDTO,
  UpdateAddressDTO,
  WishlistItem,
  AddToWishlistDTO,
  UpdateProfileDTO,
} from './customer.types';

// ─── Profile Management ──────────────────────────────────────────────────────

export async function getCustomerProfile(userId: string) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new Error('User not found');

  const defaultAddress = await db('addresses')
    .where({ user_id: userId, is_default: true }).whereNull('deleted_at')
    .first();

  const roles = await db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .select('roles.name');

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    status: user.status,
    roles: roles.map((r) => r.name),
    default_address: defaultAddress ?? null,
  };
}

export async function updateCustomerProfile(userId: string, dto: UpdateProfileDTO) {
  await db('users')
    .where({ id: userId })
    .update({
      ...dto,
      updated_at: db.fn.now(),
    });

  return getCustomerProfile(userId);
}

// ─── Address Management ─────────────────────────────────────────────────────

export async function createAddress(userId: string, dto: CreateAddressDTO): Promise<CustomerAddress> {
  return db.transaction(async trx => {
    await trx('users').where({ id: userId }).forUpdate().first();
    const first = !await trx('addresses').where({ user_id: userId }).whereNull('deleted_at').first();
    if (dto.is_default || first) await trx('addresses').where({ user_id: userId }).update({ is_default: false });
    const id = uuidv4();
    await trx('addresses').insert({ id, user_id: userId, ...dto, is_default: first || !!dto.is_default });
    return trx('addresses').where({ id }).first();
  });
}
export async function getCustomerAddresses(userId: string): Promise<CustomerAddress[]> {
  return db('addresses').where({ user_id: userId }).whereNull('deleted_at').orderBy('is_default', 'desc').orderBy('created_at', 'desc');
}
export async function getAddressById(addressId: string, userId: string): Promise<CustomerAddress | null> {
  return await db('addresses').where({ id: addressId, user_id: userId }).whereNull('deleted_at').first() ?? null;
}
export async function updateAddress(addressId: string, userId: string, dto: UpdateAddressDTO): Promise<CustomerAddress> {
  return db.transaction(async trx => {
    await trx('users').where({ id: userId }).forUpdate().first();
    const existing = await trx('addresses').where({ id: addressId, user_id: userId }).whereNull('deleted_at').first();
    if (!existing) fail('Address not found', 404);
    if (dto.is_default === false && existing.is_default) fail('Select another address as default first');
    if (dto.is_default) await trx('addresses').where({ user_id: userId }).update({ is_default: false });
    await trx('addresses').where({ id: addressId }).update({ ...dto, updated_at: trx.fn.now() });
    return trx('addresses').where({ id: addressId }).first();
  });
}
export async function deleteAddress(addressId: string, userId: string): Promise<void> {
  await db.transaction(async trx => {
    await trx('users').where({ id: userId }).forUpdate().first();
    const existing = await trx('addresses').where({ id: addressId, user_id: userId }).whereNull('deleted_at').first();
    if (!existing) fail('Address not found', 404);
    await trx('addresses').where({ id: addressId }).update({ deleted_at: new Date(), is_default: false });
    if (existing.is_default) {
      const next = await trx('addresses').where({ user_id: userId }).whereNull('deleted_at').orderBy('created_at', 'desc').first();
      if (next) await trx('addresses').where({ id: next.id }).update({ is_default: true });
    }
  });
}
export async function setDefaultAddress(addressId: string, userId: string): Promise<CustomerAddress> {
  return updateAddress(addressId, userId, { is_default: true });
}

// ─── Wishlist Management ─────────────────────────────────────────────────────

export async function addToWishlist(userId: string, dto: AddToWishlistDTO): Promise<WishlistItem> {
  const product = await getProductById(dto.product_id);
  if (!product) {
    throw new Error('Product not found');
  }

  const existing = await db('wishlists')
    .where({
      user_id: userId,
      product_id: dto.product_id,
      variant_id: dto.variant_id ?? null,
    })
    .first();

  if (existing) {
    return {
      ...existing,
      product,
    };
  }

  const itemId = uuidv4();
  await db('wishlists').insert({
    id: itemId,
    user_id: userId,
    product_id: dto.product_id,
    variant_id: dto.variant_id ?? null,
  });

  const item = await db('wishlists').where({ id: itemId }).first();
  return {
    ...item,
    product,
  };
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await db('wishlists').where({ user_id: userId, product_id: productId }).delete();
}

export async function getCustomerWishlist(userId: string): Promise<WishlistItem[]> {
  const items = await db('wishlists').where({ user_id: userId }).orderBy('created_at', 'desc');
  const result: WishlistItem[] = [];

  for (const i of items) {
    const product = await getProductById(i.product_id);
    result.push({
      ...i,
      product,
    });
  }

  return result;
}
