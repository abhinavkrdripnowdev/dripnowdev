import { createOfferSchema, createComboOfferSchema } from './offer.validators';
import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../../utils/response';
import * as offerService from './offer.service';
import * as sellerService from '../seller/seller.service';

export async function createOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller || seller.status !== 'approved') {
      sendBadRequest(res, 'Only approved sellers can create offers');
      return;
    }

    const offer = await offerService.createSellerOffer(seller.id, createOfferSchema.strict().parse(req.body));
    sendSuccess(res, offer, 'Offer created successfully', 201);
  } catch (error: any) {
    next(error);
  }
}

export async function getSellerOffers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const offers = await offerService.getSellerOffers(seller.id);
    sendSuccess(res, offers);
  } catch (error: any) {
    next(error);
  }
}

export async function getOfferByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const code = req.params.code as string;
    const offer = await offerService.getOfferByCode(code);
    if (!offer) {
      sendNotFound(res, 'Invalid or expired offer coupon code');
      return;
    }
    sendSuccess(res, offer);
  } catch (error: any) {
    next(error);
  }
}

export async function createComboOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller || seller.status !== 'approved') {
      sendBadRequest(res, 'Only approved sellers can create combo offers');
      return;
    }

    const combo = await offerService.createComboOffer(seller.id, createComboOfferSchema.strict().parse(req.body));
    sendSuccess(res, combo, 'Combo offer created successfully', 201);
  } catch (error: any) {
    next(error);
  }
}

export async function getSellerComboOffers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const combos = await offerService.getSellerComboOffers(seller.id);
    sendSuccess(res, combos);
  } catch (error: any) {
    next(error);
  }
}
