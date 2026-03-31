import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed tariff tiers (EMRC rates effective July 2024)
  const residentialTiers = [
    { sector: 'residential_subsidized', tierNumber: 1, minKwh: 1, maxKwh: 300, rateFils: 50, label: 'Tier 1 (1-300 kWh)', labelAr: 'الشريحة 1 (1-300 ك.و.س)' },
    { sector: 'residential_subsidized', tierNumber: 2, minKwh: 301, maxKwh: 600, rateFils: 100, label: 'Tier 2 (301-600 kWh)', labelAr: 'الشريحة 2 (301-600 ك.و.س)' },
    { sector: 'residential_subsidized', tierNumber: 3, minKwh: 601, maxKwh: 999999, rateFils: 200, label: 'Tier 3 (600+ kWh)', labelAr: 'الشريحة 3 (أكثر من 600 ك.و.س)' },
    { sector: 'residential_unsubsidized', tierNumber: 1, minKwh: 1, maxKwh: 1000, rateFils: 120, label: 'Tier 1 (1-1000 kWh)', labelAr: 'الشريحة 1 (1-1000 ك.و.س)' },
    { sector: 'residential_unsubsidized', tierNumber: 2, minKwh: 1001, maxKwh: 999999, rateFils: 150, label: 'Tier 2 (1000+ kWh)', labelAr: 'الشريحة 2 (أكثر من 1000 ك.و.س)' },
    { sector: 'commercial', tierNumber: 1, minKwh: 1, maxKwh: 2000, rateFils: 120, label: 'Tier 1 (1-2000 kWh)', labelAr: 'الشريحة 1 (1-2000 ك.و.س)' },
    { sector: 'commercial', tierNumber: 2, minKwh: 2001, maxKwh: 999999, rateFils: 152, label: 'Tier 2 (2000+ kWh)', labelAr: 'الشريحة 2 (أكثر من 2000 ك.و.س)' },
  ];

  for (const tier of residentialTiers) {
    await prisma.tariffTier.upsert({
      where: { sector_tierNumber: { sector: tier.sector, tierNumber: tier.tierNumber } },
      update: tier,
      create: tier,
    });
  }
  console.log(`Seeded ${residentialTiers.length} tariff tiers`);

  // Seed tariff periods (time-of-use)
  const periods = [
    { name: 'Peak', nameAr: 'ذروة', startHour: 17, endHour: 23, isPeak: true, multiplier: 1.0 },
    { name: 'Partial Peak', nameAr: 'ذروة جزئية', startHour: 14, endHour: 17, isPeak: false, multiplier: 0.87 },
    { name: 'Off-Peak (Evening)', nameAr: 'خارج الذروة (مساء)', startHour: 23, endHour: 5, isPeak: false, multiplier: 0.75 },
    { name: 'Off-Peak (Morning)', nameAr: 'خارج الذروة (صباح)', startHour: 5, endHour: 14, isPeak: false, multiplier: 0.75 },
  ];

  for (const period of periods) {
    const existing = await prisma.tariffPeriod.findFirst({
      where: { name: period.name },
    });
    if (!existing) {
      await prisma.tariffPeriod.create({ data: period });
    }
  }
  console.log(`Seeded ${periods.length} tariff periods`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
