import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create default System Tenant
  const systemTenant = await prisma.tenant.create({
    data: {
      name: 'System Tenant',
    },
  });

  // Create default Plans
  const freePlan = await prisma.plan.create({
    data: {
      name: 'Free',
      price: 0.0,
      trialDays: 14, // 14 Days free trial
      limits: { users: 1, storage: '1GB', api_calls: 1000 },
      features: ['Basic access'],
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: 'Pro',
      price: 29.99,
      trialDays: 0,
      limits: { users: 10, storage: '10GB', api_calls: 100000 },
      features: ['Basic access', 'Premium support', 'Advance Usage limits'],
    },
  });

  // Create Admin Role
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      tenantId: systemTenant.id,
      permissions: {
        create: [
          { action: 'all', resource: 'all', tenantId: systemTenant.id },
        ],
      },
    },
  });

  // Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@saas.com',
      password: hashedPassword,
      name: 'System Admin',
      isEmailVerified: true,
      roleId: adminRole.id,
      tenantId: systemTenant.id,
    },
  });

  console.log('Seeding completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
