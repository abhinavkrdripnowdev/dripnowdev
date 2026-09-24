import { z } from 'zod';

export const updateSellerOrderStatusSchema = z.object({
  status: z.enum(['accepted', 'preparing', 'ready_for_pickup', 'cancelled']),
  notes: z.string().max(500).optional(),
});
