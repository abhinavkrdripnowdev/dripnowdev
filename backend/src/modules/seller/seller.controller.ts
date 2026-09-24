import { Request, Response } from 'express';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../../utils/response';
import * as sellerService from './seller.service';

export async function registerSeller(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await sellerService.createOrUpdateSellerProfile(userId, req.body);
    sendSuccess(res, profile, 'Seller application submitted successfully', 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to register seller');
  }
}

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await sellerService.getSellerProfileByUserId(userId);
    if (!profile) {
      sendNotFound(res, 'Seller profile not found for this account');
      return;
    }
    const documents = await sellerService.getSellerDocuments(profile.id);
    const location = await sellerService.getSellerLocation(profile.id);

    sendSuccess(res, { ...profile, documents, location });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve seller profile');
  }
}

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
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
    sendError(res, error.message || 'Failed to update seller profile');
  }
}

export async function addDocument(req: Request, res: Response): Promise<void> {
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
    sendError(res, error.message || 'Failed to upload document');
  }
}

export async function updateLocation(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await sellerService.getSellerProfileByUserId(userId);
    if (!profile) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const location = await sellerService.addOrUpdateSellerLocation(profile.id, req.body);
    sendSuccess(res, location, 'Store location updated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update store location');
  }
}

export async function getDashboardOverview(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await sellerService.getSellerProfileByUserId(userId);
    if (!profile) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const overview = await sellerService.getSellerDashboardOverview(profile.id);
    sendSuccess(res, overview);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch dashboard overview');
  }
}
