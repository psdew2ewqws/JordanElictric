/**
 * EMRC Tariff Configuration — effective 1 July 2024
 * Ported from NAWWAR: project/settings/base.py EMRC_TARIFFS
 */

export interface TariffTierConfig {
  tier: number;
  minKwh: number;
  maxKwh: number;
  rateFils: number;
  label: string;
  labelAr: string;
}

export interface SectorTariff {
  tiers: TariffTierConfig[];
  fixedCharges: {
    meterRentFils: number;
    tvLicenseFils: number;
    ruralDevFeeFilsPerKwh: number;
    wasteFils: number;
  };
  municipalityTaxPercent: number;
  minimumMonthlyFils: number;
}

export const EMRC_TARIFFS: Record<string, SectorTariff> = {
  residential_subsidized: {
    tiers: [
      {
        tier: 1,
        minKwh: 1,
        maxKwh: 300,
        rateFils: 50,
        label: 'Tier 1 (1-300 kWh)',
        labelAr: 'الشريحة 1 (1-300 ك.و.س)',
      },
      {
        tier: 2,
        minKwh: 301,
        maxKwh: 600,
        rateFils: 100,
        label: 'Tier 2 (301-600 kWh)',
        labelAr: 'الشريحة 2 (301-600 ك.و.س)',
      },
      {
        tier: 3,
        minKwh: 601,
        maxKwh: 999999,
        rateFils: 200,
        label: 'Tier 3 (600+ kWh)',
        labelAr: 'الشريحة 3 (أكثر من 600 ك.و.س)',
      },
    ],
    fixedCharges: {
      meterRentFils: 200,
      tvLicenseFils: 1000,
      ruralDevFeeFilsPerKwh: 1,
      wasteFils: 0,
    },
    municipalityTaxPercent: 10,
    minimumMonthlyFils: 1750,
  },

  residential_unsubsidized: {
    tiers: [
      {
        tier: 1,
        minKwh: 1,
        maxKwh: 1000,
        rateFils: 120,
        label: 'Tier 1 (1-1000 kWh)',
        labelAr: 'الشريحة 1 (1-1000 ك.و.س)',
      },
      {
        tier: 2,
        minKwh: 1001,
        maxKwh: 999999,
        rateFils: 150,
        label: 'Tier 2 (1000+ kWh)',
        labelAr: 'الشريحة 2 (أكثر من 1000 ك.و.س)',
      },
    ],
    fixedCharges: {
      meterRentFils: 200,
      tvLicenseFils: 1000,
      ruralDevFeeFilsPerKwh: 1,
      wasteFils: 0,
    },
    municipalityTaxPercent: 10,
    minimumMonthlyFils: 1750,
  },

  commercial: {
    tiers: [
      {
        tier: 1,
        minKwh: 1,
        maxKwh: 2000,
        rateFils: 120,
        label: 'Tier 1 (1-2000 kWh)',
        labelAr: 'الشريحة 1 (1-2000 ك.و.س)',
      },
      {
        tier: 2,
        minKwh: 2001,
        maxKwh: 999999,
        rateFils: 152,
        label: 'Tier 2 (2000+ kWh)',
        labelAr: 'الشريحة 2 (أكثر من 2000 ك.و.س)',
      },
    ],
    fixedCharges: {
      meterRentFils: 200,
      tvLicenseFils: 0,
      ruralDevFeeFilsPerKwh: 1,
      wasteFils: 0,
    },
    municipalityTaxPercent: 10,
    minimumMonthlyFils: 2000,
  },
};

/**
 * Direct subsidy deductions (residential subsidized only)
 * Ported from NAWWAR: EMRC_DIRECT_SUBSIDY
 */
export const EMRC_DIRECT_SUBSIDY: { minKwh: number; maxKwh: number; deductionFils: number }[] = [
  { minKwh: 51, maxKwh: 200, deductionFils: 2500 },   // -2.50 JD
  { minKwh: 201, maxKwh: 600, deductionFils: 2000 },   // -2.00 JD
];

/**
 * Environmental impact factors for Jordan's electricity grid
 */
export const ENVIRONMENTAL_FACTORS = {
  co2KgPerKwh: 0.6,       // natural gas dominant grid
  waterLitersPerKwh: 2.0,  // water used in generation
  treeCo2OffsetKgPerYear: 21, // 1 tree absorbs ~21 kg CO2/year
};

/**
 * Appliance consumption profiles — typical Jordanian household
 * Ported from NAWWAR knowledge base
 */
export const APPLIANCE_PROFILES: {
  name: string;
  nameAr: string;
  icon: string;
  percentOfTotal: number;
  avgMonthlyKwh: number;
}[] = [
  { name: 'Air Conditioning', nameAr: 'تكييف', icon: 'snowflake', percentOfTotal: 0.42, avgMonthlyKwh: 134 },
  { name: 'Water Heater', nameAr: 'سخان المياه', icon: 'water', percentOfTotal: 0.18, avgMonthlyKwh: 58 },
  { name: 'Refrigerator', nameAr: 'ثلاجة', icon: 'cube', percentOfTotal: 0.15, avgMonthlyKwh: 48 },
  { name: 'Lighting', nameAr: 'إضاءة', icon: 'bulb', percentOfTotal: 0.10, avgMonthlyKwh: 32 },
  { name: 'Other', nameAr: 'أخرى', icon: 'flash', percentOfTotal: 0.15, avgMonthlyKwh: 48 },
];
