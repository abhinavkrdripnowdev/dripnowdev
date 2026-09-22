import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { sendForbidden, sendUnauthorized } from '../utils/response';

/**
 * Permission-based authorization middleware.
 * Must be used AFTER the authenticate middleware.
 * Usage: router.get('/seller/products', authenticate, authorizePermission('seller:manage_products'), handler)
 */
export function authorizePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    try {
      // Query distinct permissions owned by the user's assigned roles
      const userPermissions = await db('user_roles')
        .join('role_permissions', 'user_roles.role_id', 'role_permissions.role_id')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('user_roles.user_id', req.user.id)
        .pluck('permissions.name');

      const hasPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));

      if (!hasPermission) {
        sendForbidden(res, 'You do not have the required permission to perform this action');
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
