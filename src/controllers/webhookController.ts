import { Request, Response } from 'express';
import prisma from '../database/client';
import { logToDb } from '../utils/logger';

export const handlePaymentApproved = async (req: Request, res: Response) => {
  const { tenantId, planId, transactionId } = req.body;
  // Verify webhook signature (e.g. Stripe Signature Validation) securely in production
  
  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // Mark previous subscriptions as expired or canceled if necessary
    await prisma.subscription.updateMany({
      where: { tenantId, status: { in: ['active', 'trial'] } },
      data: { status: 'expired' },
    });

    const newSub = await prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: 'active',
        startDate: new Date(),
        expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1y duration
      },
    });
    
    await logToDb('payment_approved', `Payment authorized via Webhook (Tx: ${transactionId}) for Plan ${plan.name}`, tenantId);
    return res.status(200).json({ message: 'Success', subscription: newSub });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handlePaymentCancelled = async (req: Request, res: Response) => {
  const { tenantId, transactionId } = req.body;

  try {
    // Flag all active subscriptions for the tenant as canceled
    await prisma.subscription.updateMany({
      where: { tenantId, status: 'active' },
      data: { status: 'canceled' },
    });

    await logToDb('payment_cancelled', `Payment cancelled (Tx: ${transactionId})`, tenantId);
    return res.status(200).json({ message: 'Success cancelled' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handlePaymentRenewed = async (req: Request, res: Response) => {
  const { tenantId, transactionId, newExpiryDate } = req.body;

  try {
    // Extend the validity of the current active subscription
    await prisma.subscription.updateMany({
      where: { tenantId, status: 'active' },
      data: { expiresAt: new Date(newExpiryDate) },
    });

    await logToDb('payment_renewed', `Payment renewed (Tx: ${transactionId}) until ${newExpiryDate}`, tenantId);
    return res.status(200).json({ message: 'Success renewed' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
