import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import * as cartService from './cart.service';

export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const cart = await cartService.getCart(userId);
    sendSuccess(res, cart);
  } catch (error: any) {
    next(error);
  }
}

export async function addToCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const cart = await cartService.addToCart(userId, req.body);
    sendSuccess(res, cart, 'Item added to cart');
  } catch (error: any) {
    next(error);
  }
}

export async function updateCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const itemId = String(req.params.itemId);
    const { quantity } = req.body;
    const cart = await cartService.updateCartItem(userId, itemId, quantity);
    sendSuccess(res, cart, 'Cart updated');
  } catch (error: any) {
    next(error);
  }
}

export async function clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    await cartService.clearCart(userId);
    sendSuccess(res, null, 'Cart cleared');
  } catch (error: any) {
    next(error);
  }
}
