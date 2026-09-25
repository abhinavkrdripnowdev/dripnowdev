import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import * as orderService from './order.service';

export async function checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { address_id, payment_method, coupon_code } = z.object({ address_id: z.string().uuid(), payment_method: z.enum(['cod', 'razorpay']), coupon_code: z.string().max(50).optional() }).strict().parse(req.body);
    
    if (!address_id || !payment_method) {
      throw new Error('Address and Payment method are required');
    }

    const order = await orderService.checkout(userId, address_id, payment_method, req.get('Idempotency-Key'), false, coupon_code);
    sendSuccess(res, order, 'Order placed successfully', 201);
  } catch (error: any) {
    next(error);
  }
}

export async function getCustomerOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const orders = await orderService.getCustomerOrders(userId);
    sendSuccess(res, orders);
  } catch (error: any) {
    next(error);
  }
}

export async function getOrderDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const orderId = String(req.params.orderId);
    const order = await orderService.getOrderDetails(orderId, userId);
    sendSuccess(res, order);
  } catch (error: any) {
    next(error);
  }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const orderId = String(req.params.orderId);
    const result = await orderService.cancelOrder(orderId, userId);
    sendSuccess(res, result);
  } catch (error: any) {
    next(error);
  }
}

export async function quote(req: Request, res: Response, next: NextFunction) {
  const data = z.object({ address_id: z.string().uuid(), payment_method: z.enum(['cod', 'razorpay']), coupon_code: z.string().max(50).optional() }).strict().parse(req.body);
  sendSuccess(res, await orderService.checkout(req.user!.id, data.address_id, data.payment_method, undefined, true, data.coupon_code));
}
