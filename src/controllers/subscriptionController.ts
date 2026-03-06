import { Response } from 'express';
import prisma from '../database/client';
import { AuthRequest } from '../middleware/auth';
import { logToDb } from '../utils/logger';

export const getSubscriptions = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId as string;

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { tenantId },
      include: { plan: true },
    });

    return res.json({ subscriptions });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createSubscription = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId as string;
  const { planId } = req.body;

  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const newSub = await prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: 'active',
        startDate: new Date(),
        expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year mock
      },
    });

    await logToDb('create_subscription', `Subscription created for plan ${plan.name}`, tenantId, req.user?.userId);
    return res.status(201).json({ subscription: newSub });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
