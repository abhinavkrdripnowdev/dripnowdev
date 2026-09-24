import { Request, Response } from 'express';
import { sendSuccess, sendError, sendNotFound } from '../../utils/response';
import * as customerService from './customer.service';

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await customerService.getCustomerProfile(userId);
    sendSuccess(res, profile);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch customer profile');
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await customerService.updateCustomerProfile(userId, req.body);
    sendSuccess(res, profile, 'Profile updated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update customer profile');
  }
}

// ─── Address Management ─────────────────────────────────────────────────────

export async function createAddress(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const address = await customerService.createAddress(userId, req.body);
    sendSuccess(res, address, 'Address added successfully', 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to add address');
  }
}

export async function getAddresses(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const addresses = await customerService.getCustomerAddresses(userId);
    sendSuccess(res, addresses);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch addresses');
  }
}

export async function updateAddress(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const addressId = req.params.id as string;
    const address = await customerService.updateAddress(addressId, userId, req.body);
    sendSuccess(res, address, 'Address updated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update address');
  }
}

export async function deleteAddress(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const addressId = req.params.id as string;
    await customerService.deleteAddress(addressId, userId);
    sendSuccess(res, null, 'Address deleted successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete address');
  }
}

export async function setDefaultAddress(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const addressId = req.params.id as string;
    const address = await customerService.setDefaultAddress(addressId, userId);
    sendSuccess(res, address, 'Default address updated');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to set default address');
  }
}

// ─── Wishlist Management ─────────────────────────────────────────────────────

export async function addToWishlist(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const item = await customerService.addToWishlist(userId, req.body);
    sendSuccess(res, item, 'Product added to wishlist', 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to add to wishlist');
  }
}

export async function removeFromWishlist(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const productId = req.params.productId as string;
    await customerService.removeFromWishlist(userId, productId);
    sendSuccess(res, null, 'Product removed from wishlist');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to remove from wishlist');
  }
}

export async function getWishlist(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const wishlist = await customerService.getCustomerWishlist(userId);
    sendSuccess(res, wishlist);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch wishlist');
  }
}
