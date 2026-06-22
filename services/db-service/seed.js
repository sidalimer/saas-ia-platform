const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (in order of dependencies)
  await prisma.payment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aiRequest.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();

  console.log('✅ Cleared existing data');

  // Create Plans
  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        name: 'Starter',
        slug: 'starter',
        description: 'Perfect for individuals and small projects',
        monthlyPrice: 990, // $9.90
        yearlyPrice: 9900, // $99.00
        aiRequestsLimit: 50,
        features: JSON.stringify(['50 AI requests/month', 'Email support', 'Basic analytics']),
        sortOrder: 1,
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Pro',
        slug: 'pro',
        description: 'For professionals and growing teams',
        monthlyPrice: 2990, // $29.90
        yearlyPrice: 29900, // $299.00
        aiRequestsLimit: 500,
        features: JSON.stringify(['500 AI requests/month', 'Priority support', 'Advanced analytics', 'API access']),
        sortOrder: 2,
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'For large organizations with custom needs',
        monthlyPrice: 9990, // $99.90
        yearlyPrice: 99900, // $999.00
        aiRequestsLimit: 10000,
        features: JSON.stringify(['Unlimited AI requests', '24/7 dedicated support', 'Custom integrations', 'SLA guarantee', 'Team management']),
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`✅ Created ${plans.length} plans`);

  // Create test users
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@saas-ia.local',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  const testUser = await prisma.user.create({
    data: {
      email: 'user@saas-ia.local',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      emailVerified: true,
    },
  });

  const unverifiedUser = await prisma.user.create({
    data: {
      email: 'unverified@saas-ia.local',
      passwordHash,
      firstName: 'Unverified',
      lastName: 'User',
      role: 'USER',
      emailVerified: false,
    },
  });

  console.log(`✅ Created 3 test users (admin@saas-ia.local, user@saas-ia.local, unverified@saas-ia.local)`);

  // Create subscription for test user (Pro plan)
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await prisma.subscription.create({
    data: {
      userId: testUser.id,
      planId: plans[1].id, // Pro plan
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      aiRequestsUsed: 5,
    },
  });

  console.log('✅ Created Pro subscription for test user');

  // Create some sample AI requests
  await prisma.aiRequest.createMany({
    data: [
      {
        userId: testUser.id,
        prompt: 'Explain machine learning in simple terms',
        response: '[MOCK] Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed...',
        model: 'gemini-pro',
        tokens: 150,
        status: 'COMPLETED',
        durationMs: 1200,
      },
      {
        userId: testUser.id,
        prompt: 'What is the difference between SQL and NoSQL?',
        response: '[MOCK] SQL databases are relational, using structured tables with schemas. NoSQL databases are non-relational, supporting various data models like document, key-value, graph...',
        model: 'gemini-pro',
        tokens: 180,
        status: 'COMPLETED',
        durationMs: 950,
      },
    ],
  });

  console.log('✅ Created sample AI requests');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
