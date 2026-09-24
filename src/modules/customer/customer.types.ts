import { Product } from '../product/product.types';

export type AddressType = 'home' | 'work' | 'other';

export interface CustomerAddress {
  id: string;
  user_id: string;
  address_line1: string;
  address_line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postal_code: string;
  latitude?: number | null;
  longitude?: number | null;
  type: AddressType;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressDTO {
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  type?: AddressType;
  is_default?: boolean;
}

export interface UpdateAddressDTO {
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  type?: AddressType;
  is_default?: boolean;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id?: string | null;
  product?: Product | null;
  created_at: string;
}

export interface AddToWishlistDTO {
  product_id: string;
  variant_id?: string;
}

export interface UpdateProfileDTO {
  full_name?: string;
  avatar_url?: string;
}
