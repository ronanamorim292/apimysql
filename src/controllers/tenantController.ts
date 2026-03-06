import { Request, Response } from 'express';
import prisma from '../database/client';
import { AuthRequest } from '../middleware/auth';
import { logToDb } from '../utils/logger';

export const getTenants = async (req: AuthRequest, res: Response) => {
  try {
    // Typical SaaS setup: Admin sees all, normal users see their own. Let's make it scoped to the user's tenant for security, or system admins see all.
    // Assuming simple multi-tenant: the user can only see information about their own tenant unless they are superadmin.
    if (req.user?.role === 'admin' && req.user.tenantId) {
       // if we want "System Admin", we might check if tenantId is the system tenant, but simple version:
       // just return the user's tenant
       const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenantId }
       });
       return res.json({ tenant });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: req.user?.tenantId } });
    return res.json({ tenant });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const tenant = await prisma.tenant.create({
      data: { name },
    });

    // Create default 'admin' and 'user' roles for this new tenant
    await prisma.role.createMany({
      data: [
        { name: 'admin', tenantId: tenant.id },
        { name: 'user', tenantId: tenant.id },
      ]
    });

    return res.status(201).json({ tenant });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
