import { Response } from 'express';
import prisma from '../database/client';
import { AuthRequest } from '../middleware/auth';

export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
  // Only system admin should see this ideally, but as requested:
  // "Also generate an admin dashboard route for managing tenants, users and subscriptions."
  try {
    const totalTenants = await prisma.tenant.count();
    const totalUsers = await prisma.user.count();
    const totalSubscriptions = await prisma.subscription.count({ where: { status: 'active' } });

    const recentTenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        tenant: { select: { name: true } }
      }
    });

    const recentSubscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        tenant: { select: { name: true } },
        plan: { select: { name: true, price: true } }
      }
    });

    return res.json({
      stats: { totalTenants, totalUsers, totalSubscriptions },
      recentTenants,
      recentUsers: recentUsers.map(u => ({ id: u.id, email: u.email, tenantName: u.tenant.name })),
      recentSubscriptions: recentSubscriptions.map(s => ({ id: s.id, tenantName: s.tenant.name, planName: s.plan.name, status: s.status }))
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
