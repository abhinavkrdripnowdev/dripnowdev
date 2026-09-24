import { z } from 'zod';

export const createSellerSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters').max(255),
  business_type: z.string().max(100).optional(),
  gstin: z.string().max(50).optional(),
  pan: z.string().max(50).optional(),
  bank_account_number: z.string().max(100).optional(),
  bank_ifsc: z.string().max(50).optional(),
  bank_name: z.string().max(100).optional(),
  location: z
    .object({
      address_line1: z.string().min(3).max(255),
      address_line2: z.string().max(255).optional(),
      city: z.string().min(2).max(100),
      state: z.string().min(2).max(100),
      postal_code: z.string().min(3).max(20),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    })
    .optional(),
  documents: z
    .array(
      z.object({
        document_type: z.enum(['gst_certificate', 'pan_card', 'fssai', 'cancelled_cheque', 'other']),
        document_url: z.string().url('Document URL must be valid'),
      })
    )
    .optional(),
});

export const updateSellerSchema = z.object({
  business_name: z.string().min(2).max(255).optional(),
  business_type: z.string().max(100).optional(),
  gstin: z.string().max(50).optional(),
  pan: z.string().max(50).optional(),
  bank_account_number: z.string().max(100).optional(),
  bank_ifsc: z.string().max(50).optional(),
  bank_name: z.string().max(100).optional(),
});

export const addDocumentSchema = z.object({
  document_type: z.enum(['gst_certificate', 'pan_card', 'fssai', 'cancelled_cheque', 'other']),
  document_url: z.string().url('Document URL must be valid'),
});

export const addLocationSchema = z.object({
  address_line1: z.string().min(3).max(255),
  address_line2: z.string().max(255).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postal_code: z.string().min(3).max(20),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
