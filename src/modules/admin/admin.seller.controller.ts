import { Request, Response } from 'express';
import { db } from '../../config/database';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../../utils/response';

export async function listSellers(req: Request, res: Response): Promise<void> {
  try {
    const status = req.query.status as string;
    let query = db('seller_profiles')
      .join('users', 'seller_profiles.user_id', 'users.id')
      .select(
        'seller_profiles.*',
        'users.full_name as applicant_name',
        'users.email as applicant_email',
        'users.phone as applicant_phone'
      );

    if (status) {
      query = query.where('seller_profiles.status', status);
    }

    const sellers = await query.orderBy('seller_profiles.created_at', 'desc');
    sendSuccess(res, sellers);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to list seller applications');
  }
}

export async function getSellerDetails(req: Request, res: Response): Promise<void> {
  try {
    const sellerId = req.params.id;
    const seller = await db('seller_profiles')
      .join('users', 'seller_profiles.user_id', 'users.id')
      .where('seller_profiles.id', sellerId)
      .select(
        'seller_profiles.*',
        'users.full_name as applicant_name',
        'users.email as applicant_email',
        'users.phone as applicant_phone'
      )
      .first();

    if (!seller) {
      sendNotFound(res, 'Seller application not found');
      return;
    }

    const documents = await db('seller_documents').where({ seller_id: sellerId });
    const location = await db('seller_locations').where({ seller_id: sellerId }).first();

    sendSuccess(res, { ...seller, documents, location });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch seller application details');
  }
}

export async function approveSeller(req: Request, res: Response): Promise<void> {
  try {
    const sellerId = req.params.id;
    const adminId = req.user!.id;

    const seller = await db('seller_profiles').where({ id: sellerId }).first();
    if (!seller) {
      sendNotFound(res, 'Seller application not found');
      return;
    }

    // Update seller_profiles status
    await db('seller_profiles')
      .where({ id: sellerId })
      .update({
        status: 'approved',
        updated_at: db.fn.now(),
      });

    // Update onboarding_applications status
    await db('onboarding_applications')
      .where({ user_id: seller.user_id, role_applied: 'seller' })
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    // Grant 'seller' role (role_id 2) in user_roles
    const existingRole = await db('user_roles')
      .where({ user_id: seller.user_id, role_id: 2 })
      .first();

    if (!existingRole) {
      await db('user_roles').insert({
        user_id: seller.user_id,
        role_id: 2,
        granted_by: adminId,
      });
    }

    // Create audit log
    await db('audit_logs').insert({
      user_id: adminId,
      action: 'ADMIN_APPROVE_SELLER',
      metadata: JSON.stringify({ seller_id: sellerId, applicant_user_id: seller.user_id, entity_type: 'seller_profile' }),
    });

    const updated = await db('seller_profiles').where({ id: sellerId }).first();
    sendSuccess(res, updated, 'Seller application approved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to approve seller');
  }
}

export async function rejectSeller(req: Request, res: Response): Promise<void> {
  try {
    const sellerId = req.params.id;
    const adminId = req.user!.id;
    const { reason } = req.body;

    if (!reason) {
      sendBadRequest(res, 'Rejection reason is required');
      return;
    }

    const seller = await db('seller_profiles').where({ id: sellerId }).first();
    if (!seller) {
      sendNotFound(res, 'Seller application not found');
      return;
    }

    // Update seller_profiles status
    await db('seller_profiles')
      .where({ id: sellerId })
      .update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: db.fn.now(),
      });

    // Update onboarding_applications status
    await db('onboarding_applications')
      .where({ user_id: seller.user_id, role_applied: 'seller' })
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: adminId,
        reviewed_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    // Create audit log
    await db('audit_logs').insert({
      user_id: adminId,
      action: 'ADMIN_REJECT_SELLER',
      metadata: JSON.stringify({ seller_id: sellerId, reason, entity_type: 'seller_profile' }),
    });

    const updated = await db('seller_profiles').where({ id: sellerId }).first();
    sendSuccess(res, updated, 'Seller application rejected');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to reject seller');
  }
}
