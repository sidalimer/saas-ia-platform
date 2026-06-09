import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Plans ──────────────────────────────────────────────────
  const plans = [
    {
      name: 'Free',
      slug: 'free',
      description: 'Get started with basic AI features',
      monthlyPrice: 0,
      yearlyPrice: 0,
      aiRequestsLimit: 20,
      features: JSON.stringify(['20 AI requests/month', 'Basic models', 'Email support']),
      sortOrder: 0,
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'For professionals who need more power',
      monthlyPrice: 1900,
      yearlyPrice: 19000,
      aiRequestsLimit: 500,
      features: JSON.stringify(['500 AI requests/month', 'Advanced models', 'Priority support', 'API access']),
      sortOrder: 1,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Unlimited AI for teams and organizations',
      monthlyPrice: 4900,
      yearlyPrice: 49000,
      aiRequestsLimit: 10000,
      features: JSON.stringify(['10 000 AI requests/month', 'All models', 'Dedicated support', 'API access', 'Custom integrations', 'SLA']),
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
    console.log(`  ✔ Plan "${plan.name}" upserted`);
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
