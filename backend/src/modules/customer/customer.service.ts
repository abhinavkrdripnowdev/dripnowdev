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
    .where({ user_id: userId, is_default: true })
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
  const addressId = uuidv4();

  // If this address is set as default, reset other default addresses for this user
  if (dto.is_default) {
    await db('addresses').where({ user_id: userId }).update({ is_default: false });
  }

  // If user has no existing addresses, force first address as default
  const existingCountRes = await db('addresses').where({ user_id: userId }).count({ count: '*' }).first();
  const existingCount = Number(existingCountRes?.count ?? 0);
  const isDefault = existingCount === 0 ? true : dto.is_default ?? false;

  await db('addresses').insert({
    id: addressId,
    user_id: userId,
    address_line1: dto.address_line1,
    address_line2: dto.address_line2 ?? null,
    landmark: dto.landmark ?? null,
    city: dto.city,
    state: dto.state,
    postal_code: dto.postal_code,
    latitude: dto.latitude ?? null,
    longitude: dto.longitude ?? null,
    type: dto.type ?? 'home',
    is_default: isDefault,
  });

  const addr = await db('addresses').where({ id: addressId }).first();
  return { ...addr, is_default: Boolean(addr.is_default) };
}

export async function getCustomerAddresses(userId: string): Promise<CustomerAddress[]> {
  return db('addresses').where({ user_id: userId }).orderBy('is_default', 'desc').orderBy('created_at', 'desc');
}

export async function getAddressById(addressId: string, userId: string): Promise<CustomerAddress | null> {
  const addr = await db('addresses').where({ id: addressId, user_id: userId }).first();
  return addr ?? null;
}

export async function updateAddress(
  addressId: string,
  userId: string,
  dto: UpdateAddressDTO
): Promise<CustomerAddress> {
  const existing = await getAddressById(addressId, userId);
  if (!existing) {
    throw new Error('Address not found');
  }

  if (dto.is_default) {
    await db('addresses').where({ user_id: userId }).update({ is_default: false });
  }

  await db('addresses')
    .where({ id: addressId })
    .update({
      ...dto,
      updated_at: db.fn.now(),
    });

  return db('addresses').where({ id: addressId }).first();
}

export async function deleteAddress(addressId: string, userId: string): Promise<void> {
  const existing = await getAddressById(addressId, userId);
  if (!existing) {
    throw new Error('Address not found');
  }

  await db('addresses').where({ id: addressId }).delete();

  // If deleted address was default, make the latest address default
  if (existing.is_default) {
    const nextAddress = await db('addresses').where({ user_id: userId }).orderBy('created_at', 'desc').first();
    if (nextAddress) {
      await db('addresses').where({ id: nextAddress.id }).update({ is_default: true });
    }
  }
}

export async function setDefaultAddress(addressId: string, userId: string): Promise<CustomerAddress> {
  const existing = await getAddressById(addressId, userId);
  if (!existing) {
    throw new Error('Address not found');
  }

  await db('addresses').where({ user_id: userId }).update({ is_default: false });
  await db('addresses').where({ id: addressId }).update({ is_default: true, updated_at: db.fn.now() });

  return db('addresses').where({ id: addressId }).first();
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
