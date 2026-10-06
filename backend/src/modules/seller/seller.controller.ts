import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../../utils/response';
import * as sellerService from './seller.service';

export async function registerSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await sellerService.createOrUpdateSellerProfile(userId, req.body);
    sendSuccess(res, profile, 'Seller application submitted successfully', 201);
  } catch (error: any) {
    next(error);
  }
}

export async function getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await sellerService.getSellerProfileByUserId(userId);
    if (!profile) {
      sendSuccess(res, null);
      return;
    }
    const documents = await sellerService.getSellerDocuments(profile.id);
    const location = await sellerService.getSellerLocation(profile.id);

    sendSuccess(res, { ...profile, documents, location });
  } catch (error: any) {
    next(error);
  }
}

export async function updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await sellerService.getSellerProfileByUserId(userId);
    if (!profile) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const updated = await sellerService.updateSellerProfile(profile.id, req.body);
    sendSuccess(res, updated, 'Seller profile updated successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function addDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await sellerService.getSellerProfileByUserId(userId);
    if (!profile) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const doc = await sellerService.addSellerDocument(
      profile.id,
      req.body.document_type,
      req.body.document_url
    );
    sendSuccess(res, doc, 'Document uploaded successfully', 201);
  } catch (error: any) {
    next(error);
  }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    let profile = await sellerService.getSellerProfileByUserId(userId);
    if (!profile) {
      profile = await sellerService.createOrUpdateSellerProfile(userId, { business_name: 'Pending Seller' });
    }

    const location = await sellerService.addOrUpdateSellerLocation(profile.id, req.body);
    sendSuccess(res, location, 'Store location updated successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getDashboardOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await sellerService.getSellerProfileByUserId(userId);
    if (!profile) {
      sendSuccess(res, {
        seller_id: '',
        business_name: '',
        status: 'draft',
        total_products: 0,
        low_stock_products_count: 0,
        pending_orders_count: 0,
        total_orders_count: 0,
        total_earnings: 0,
      });
      return;
    }

    const overview = await sellerService.getSellerDashboardOverview(profile.id);
    sendSuccess(res, overview);
  } catch (error: any) {
    next(error);
  }
}
