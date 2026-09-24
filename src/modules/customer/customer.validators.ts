import { z } from 'zod';

export const createAddressSchema = z.object({
  address_line1: z.string().min(3, 'Address line 1 must be at least 3 characters').max(255),
  address_line2: z.string().max(255).optional(),
  landmark: z.string().max(255).optional(),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  postal_code: z.string().min(3, 'Valid PIN/Postal code required').max(20),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  type: z.enum(['home', 'work', 'other']).optional().default('home'),
  is_default: z.boolean().optional().default(false),
});

export const updateAddressSchema = z.object({
  address_line1: z.string().min(3).max(255).optional(),
  address_line2: z.string().max(255).optional(),
  landmark: z.string().max(255).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  postal_code: z.string().min(3).max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  type: z.enum(['home', 'work', 'other']).optional(),
  is_default: z.boolean().optional(),
});

export const addToWishlistSchema = z.object({
  product_id: z.string().uuid('Valid product ID required'),
  variant_id: z.string().uuid().optional(),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  avatar_url: z.string().url('Avatar URL must be valid').optional(),
});
