import { RequestHandler } from 'express';
import { db } from '../config/database';
import { fail } from '../utils/httpError';
export const ownsProduct: RequestHandler = async (req, _res, next) => {
  const seller = await db('seller_profiles').where({ user_id: req.user!.id, status: 'approved' }).first();
  if (!seller) fail('Approved seller required', 403);
  let productId = req.params.id;
  if (req.params.variantId) {
    const variant = await db('product_variants').where({ id: String(req.params.variantId) }).first();
    productId = variant?.product_id;
  }
  if (!productId || !await db('products').where({ id: String(productId), seller_id: seller.id }).first()) fail('Product not found', 404);
  next();
};
