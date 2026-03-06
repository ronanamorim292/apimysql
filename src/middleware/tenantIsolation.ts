import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Ensures that the req.tenantId is explicitly tracked
 * and prevents querying data belonging to another tenant
 */
export const enforceTenantIsolation = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Assuming authenticate middleware has already run and populated req.user
  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({ error: 'Tenant isolation failed: Missing tenant context' });
  }

  // Inject a verified isolated tenant scope for the controllers to rely on
  req.tenantId = req.user.tenantId;

  next();
};

// Augment express Request interface to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}
