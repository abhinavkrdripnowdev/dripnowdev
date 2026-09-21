import { Request, Response, NextFunction } from 'express';
import { sendForbidden, sendUnauthorized } from '../utils/response';

export type RoleName = 'customer' | 'seller' | 'delivery_partner' | 'manager' | 'super_admin';

/**
 * Role-based authorization middleware.
 * Must be used AFTER the authenticate middleware.
 * Usage: router.get('/admin', authenticate, authorize('super_admin', 'manager'), handler)
 */
export function authorize(...allowedRoles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    const userRoles = req.user.roles ?? [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      sendForbidden(res, 'You do not have permission to access this resource');
      return;
    }

    next();
  };
}
