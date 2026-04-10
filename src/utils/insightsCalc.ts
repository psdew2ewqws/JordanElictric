/**
 * Insights Calculations — Pure functions for EMRC tariff math,
 * environmental impact, and psychology-driven recommendations.
 *
 * All rates sourced from EMRC tariff effective 1 July 2024.
 * Environmental factors from Jordan's natural-gas-dominant grid.
 */

// ─── EMRC Tariff Constants ─────────────────────────────────

const TIER1_LIMIT = 300;
const TIER2_LIMIT = 600;
const TIER1_RATE = 0.050; // JD/kWh
const TIER2_RATE = 0.100;
const TIER3_RATE = 0.200;

const METER_RENT_JD = 0.200;
const TV_LICENSE_JD = 1.000;
const RURAL_FEE_PER_KWH = 0.001;
const MUNICIPALITY_TAX_PCT = 0.10;

const NATIONAL_AVG_KWH = 297;

// ─── Environmental Constants ───────────────────────────────

const CO2_PER_KWH = 0.71;      // kg — verified from FusionSolar Jordan (236.30/332.82)
const COAL_PER_KWH = 0.116;    // kg standard coal equivalent — from FusionSolar (38.6/332.82)
const TREE_CO2_OFFSET = 21;    // kg CO2/year per tree
const CAR_CO2_PER_KM = 0.21;   // kg CO2/km average car

// ─── Tier Breakdown ────────────────────────────────────────

export interface TierBreakdown {
  tier1Kwh: number;
  tier2Kwh: number;
  tier3Kwh: number;
  tier1Cost: number;
  tier2Cost: number;
  tier3Cost: number;
  energyCost: number;
  currentTier: 1 | 2 | 3;
}

export function calcTierBreakdown(kwh: number): TierBreakdown {
  const tier1Kwh = Math.min(kwh, TIER1_LIMIT);
  const tier2Kwh = kwh > TIER1_LIMIT ? Math.min(kwh - TIER1_LIMIT, TIER2_LIMIT - TIER1_LIMIT) : 0;
  const tier3Kwh = kwh > TIER2_LIMIT ? kwh - TIER2_LIMIT : 0;

  const tier1Cost = tier1Kwh * TIER1_RATE;
  const tier2Cost = tier2Kwh * TIER2_RATE;
  const tier3Cost = tier3Kwh * TIER3_RATE;
  const energyCost = tier1Cost + tier2Cost + tier3Cost;

  const currentTier: 1 | 2 | 3 = kwh > TIER2_LIMIT ? 3 : kwh > TIER1_LIMIT ? 2 : 1;

  return { tier1Kwh, tier2Kwh, tier3Kwh, tier1Cost, tier2Cost, tier3Cost, energyCost, currentTier };
}

// ─── Full Bill Breakdown ───────────────────────────────────

export interface BillBreakdown {
  energyCost: number;
  municipalityTax: number;
  tvLicense: number;
  meterRent: number;
  ruralFee: number;
  subsidy: number;
  total: number;
}

export function calcBillBreakdown(kwh: number): BillBreakdown {
  const { energyCost } = calcTierBreakdown(kwh);

  // Government subsidy (residential subsidized)
  let subsidy = 0;
  if (kwh >= 201 && kwh <= 600) subsidy = 2.000;
  else if (kwh >= 51 && kwh <= 200) subsidy = 2.500;

  const municipalityTax = energyCost * MUNICIPALITY_TAX_PCT;
  const ruralFee = kwh * RURAL_FEE_PER_KWH;

  const total = energyCost + municipalityTax + TV_LICENSE_JD + METER_RENT_JD + ruralFee - subsidy;

  return {
    energyCost: +energyCost.toFixed(3),
    municipalityTax: +municipalityTax.toFixed(3),
    tvLicense: TV_LICENSE_JD,
    meterRent: METER_RENT_JD,
    ruralFee: +ruralFee.toFixed(3),
    subsidy,
    total: +Math.max(total, 1.750).toFixed(3), // minimum monthly 1.75 JD
  };
}

// ─── Money Left on the Table ───────────────────────────────

export interface SavingsOpportunity {
  moneyWasted: number;      // JD overpaid vs staying in Tier 1
  kwhToDropTier: number;    // kWh to reduce to reach lower tier
  targetTier: 1 | 2;
  isInCheapestTier: boolean;
}

export function calcSavingsOpportunity(projectedKwh: number): SavingsOpportunity {
  const { tier2Kwh, tier3Kwh, currentTier } = calcTierBreakdown(projectedKwh);

  if (currentTier === 1) {
    return { moneyWasted: 0, kwhToDropTier: 0, targetTier: 1, isInCheapestTier: true };
  }

  // Money wasted = difference between actual rate and Tier 1 rate for kWh above 300
  const moneyWasted = tier2Kwh * (TIER2_RATE - TIER1_RATE) + tier3Kwh * (TIER3_RATE - TIER1_RATE);

  const kwhToDropTier = currentTier === 3
    ? projectedKwh - TIER2_LIMIT  // drop to Tier 2
    : projectedKwh - TIER1_LIMIT; // drop to Tier 1

  const targetTier: 1 | 2 = currentTier === 3 ? 2 : 1;

  return { moneyWasted: +moneyWasted.toFixed(2), kwhToDropTier, targetTier, isInCheapestTier: false };
}

// ─── Environmental Impact ──────────────────────────────────

export interface EnvironmentalImpact {
  co2Kg: number;
  coalSavedKg: number;
  treesNeeded: number;
  drivingKm: number;
  co2VsLastMonth: number;    // positive = more, negative = less
}

export function calcEnvironmentalImpact(kwh: number, lastMonthKwh?: number): EnvironmentalImpact {
  const co2Kg = +(kwh * CO2_PER_KWH).toFixed(1);
  const coalSavedKg = +(kwh * COAL_PER_KWH).toFixed(1);
  const treesNeeded = Math.ceil(co2Kg / TREE_CO2_OFFSET);
  const drivingKm = Math.round(co2Kg / CAR_CO2_PER_KM);

  const lastCo2 = lastMonthKwh ? +(lastMonthKwh * CO2_PER_KWH).toFixed(1) : 0;
  const co2VsLastMonth = lastMonthKwh ? +(co2Kg - lastCo2).toFixed(1) : 0;

  return { co2Kg, coalSavedKg, treesNeeded, drivingKm, co2VsLastMonth };
}

// ─── Daily Pace ────────────────────────────────────────────

export interface DailyPace {
  dailyAvg: number;
  projectedMonthly: number;
  projectedTier: 1 | 2 | 3;
  reductionPerDay: number;   // kWh/day to stay in lower tier
  targetTier: 1 | 2;
  daysRemaining: number;
}

export function calcDailyPace(currentKwh: number, daysInCycle: number): DailyPace {
  const days = Math.max(daysInCycle, 1);
  const dailyAvg = +(currentKwh / days).toFixed(1);
  const daysRemaining = Math.max(30 - days, 0);
  const projectedMonthly = Math.round(dailyAvg * 30);
  const projectedTier: 1 | 2 | 3 = projectedMonthly > 600 ? 3 : projectedMonthly > 300 ? 2 : 1;

  // How much to reduce per day to stay in a lower tier
  let targetTier: 1 | 2 = 1;
  let reductionPerDay = 0;

  if (projectedTier >= 2 && daysRemaining > 0) {
    // To stay in Tier 1: need (300 - currentKwh) / daysRemaining per day
    const kwhBudget = TIER1_LIMIT - currentKwh;
    if (kwhBudget > 0) {
      const targetDaily = kwhBudget / daysRemaining;
      reductionPerDay = +(dailyAvg - targetDaily).toFixed(1);
      targetTier = 1;
    } else {
      // Already past 300, aim for Tier 2 ceiling
      const kwhBudget2 = TIER2_LIMIT - currentKwh;
      if (kwhBudget2 > 0) {
        const targetDaily = kwhBudget2 / daysRemaining;
        reductionPerDay = +(dailyAvg - targetDaily).toFixed(1);
        targetTier = 2;
      }
    }
  }

  return { dailyAvg, projectedMonthly, projectedTier, reductionPerDay, targetTier, daysRemaining };
}

// ─── Social Comparison ─────────────────────────────────────

export interface Comparison {
  projectedKwh: number;
  nationalAvg: number;
  lastYearKwh: number;
  lastMonthKwh: number;
  pctVsNational: number;   // positive = above avg
  isAboveAvg: boolean;
  maxBar: number;           // for scaling bars
}

export function calcComparison(
  projectedKwh: number,
  lastMonthKwh: number,
  lastYearKwh: number,
): Comparison {
  const pctVsNational = +((projectedKwh - NATIONAL_AVG_KWH) / NATIONAL_AVG_KWH * 100).toFixed(1);

  return {
    projectedKwh,
    nationalAvg: NATIONAL_AVG_KWH,
    lastYearKwh,
    lastMonthKwh,
    pctVsNational,
    isAboveAvg: projectedKwh > NATIONAL_AVG_KWH,
    maxBar: Math.max(projectedKwh, NATIONAL_AVG_KWH, lastMonthKwh, lastYearKwh),
  };
}

// ─── Contextual Recommendations ────────────────────────────

export interface Tip {
  icon: string;          // Ionicons name
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  saveJd: number;
  saveKwh: number;
  priority: 'high' | 'medium' | 'low';
}

export function getRecommendations(projectedKwh: number, dailyAvg: number): Tip[] {
  const { currentTier } = calcTierBreakdown(projectedKwh);
  const { kwhToDropTier, targetTier } = calcSavingsOpportunity(projectedKwh);
  const tips: Tip[] = [];

  // Educational facts based on actual usage

  // AC usage context (42% of typical Jordanian household)
  const acKwh = Math.round(projectedKwh * 0.42);
  tips.push({
    icon: 'thermometer-outline',
    titleEn: `Air conditioning uses ~${acKwh} kWh of your total`,
    titleAr: `التكييف يستهلك ~${acKwh} ك.و.س من إجمالي استهلاكك`,
    descEn: `That's 42% of a typical Jordanian household's electricity — the largest single appliance`,
    descAr: `هذا 42% من استهلاك الأسرة الأردنية النموذجية — أكبر جهاز منفرد`,
    saveJd: 0,
    saveKwh: 0,
    priority: 'medium',
  });

  // Tier rate context
  if (currentTier >= 2) {
    const rate = currentTier === 3 ? '0.200' : '0.100';
    const prevRate = currentTier === 3 ? '0.100' : '0.050';
    tips.push({
      icon: 'information-circle-outline',
      titleEn: `Your kWh rate is ${rate} JD in Tier ${currentTier}`,
      titleAr: `سعر الكيلوواط ${rate} دينار في الشريحة ${currentTier}`,
      descEn: `Tier ${currentTier - 1} charges ${prevRate} JD/kWh — the rate changes at ${currentTier === 3 ? 600 : 300} kWh`,
      descAr: `الشريحة ${currentTier - 1} تكلف ${prevRate} دينار/ك.و.س — السعر يتغير عند ${currentTier === 3 ? 600 : 300} ك.و.س`,
      saveJd: 0,
      saveKwh: 0,
      priority: 'medium',
    });
  } else {
    tips.push({
      icon: 'information-circle-outline',
      titleEn: `Tier 1 is the lowest rate at 0.050 JD/kWh`,
      titleAr: `الشريحة 1 هي أقل سعر: 0.050 دينار/ك.و.س`,
      descEn: `Above 300 kWh, the rate doubles to 0.100 JD/kWh. Above 600 kWh, it becomes 0.200 JD/kWh`,
      descAr: `فوق 300 ك.و.س، السعر يتضاعف إلى 0.100 دينار/ك.و.س. فوق 600 ك.و.س، يصبح 0.200 دينار/ك.و.س`,
      saveJd: 0,
      saveKwh: 0,
      priority: 'low',
    });
  }

  // National average context
  if (projectedKwh > 297) {
    const pctAbove = Math.round(((projectedKwh - 297) / 297) * 100);
    tips.push({
      icon: 'people-outline',
      titleEn: `Your usage is ${pctAbove}% above the national average`,
      titleAr: `استهلاكك أعلى بـ${pctAbove}% من المعدل الوطني`,
      descEn: `The average Jordanian household uses about 297 kWh/month`,
      descAr: `الأسرة الأردنية تستهلك في المتوسط حوالي 297 ك.و.س/شهر`,
      saveJd: 0,
      saveKwh: 0,
      priority: 'low',
    });
  }

  return tips;
}
