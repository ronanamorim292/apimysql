import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../database/client';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

export const validatePermission = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const role = await prisma.role.findFirst({
        where: { name: req.user.role, tenantId: req.user.tenantId },
        include: { permissions: true },
      });

      if (!role) {
        return res.status(403).json({ error: 'Forbidden: Role not found' });
      }

      const hasPermission = role.permissions.some(
        (p) =>
          (p.action === action || p.action === 'all') &&
          (p.resource === resource || p.resource === 'all')
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden: Missing necessary permissions' });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
