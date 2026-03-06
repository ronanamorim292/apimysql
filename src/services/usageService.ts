import prisma from '../database/client';

export const incrementUsage = async (tenantId: string, metric: string, amount: number = 1) => {
  return await prisma.usage.upsert({
    where: { tenantId_metric: { tenantId, metric } },
    update: { value: { increment: amount } },
    create: { tenantId, metric, value: amount },
  });
};

export const checkPlanLimit = async (tenantId: string, metric: string): Promise<boolean> => {
  const sub = await prisma.subscription.findFirst({
    where: { tenantId, status: 'active' },
    include: { plan: true },
  });

  if (!sub) return false;

  const limits = sub.plan.limits as Record<string, any>;
  const limit = limits[metric];
  if (limit === undefined) return true; // Unlimited or not tracked feature for this plan

  const usage = await prisma.usage.findUnique({
    where: { tenantId_metric: { tenantId, metric } },
  });

  const currentUsage = usage?.value || 0;
  return currentUsage < limit;
};
