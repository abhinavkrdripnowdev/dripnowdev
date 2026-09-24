import { Request, Response } from 'express';
import { sendSuccess, sendError, sendNotFound } from '../../utils/response';
import * as orderService from './seller_order.service';
import * as sellerService from '../seller/seller.service';

export async function getSellerOrders(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const status = req.query.status as any;
    const orders = await orderService.getSellerOrders(seller.id, status);
    sendSuccess(res, orders);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch seller orders');
  }
}

export async function getSellerOrderById(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const orderId = req.params.id as string;
    const order = await orderService.getSellerOrderById(orderId, seller.id);
    if (!order) {
      sendNotFound(res, 'Order not found');
      return;
    }

    sendSuccess(res, order);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch order details');
  }
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const orderId = req.params.id as string;
    const updatedOrder = await orderService.updateSellerOrderStatus(orderId, seller.id, req.body);
    sendSuccess(res, updatedOrder, `Order status updated to '${req.body.status}'`);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update order status');
  }
}
