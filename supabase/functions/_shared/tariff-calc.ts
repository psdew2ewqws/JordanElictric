// Jordan EMRC residential subsidized tariff tiers
export const TIER1_LIMIT = 300;
export const TIER2_LIMIT = 600;
export const TIER1_RATE = 0.050; // JD per kWh
export const TIER2_RATE = 0.100;
export const TIER3_RATE = 0.200;

export const METER_RENT_JD = 0.200;
export const TV_LICENSE_JD = 1.000;
export const RURAL_FEE_PER_KWH = 0.001;
// JEPCO uses base fee + per-kWh rate (verified from real bills)
export const MUNICIPALITY_BASE_JD = 0.666;
export const MUNICIPALITY_PER_KWH = 0.005; // 5 fils/kWh
// EMRC fuel clause (بند الوقود) — variable monthly, often 0 fils/kWh
// Set to 0 since JEPCO real bills show 0.000 JD for recent months
export const FUEL_CLAUSE_PER_KWH = 0;
export const NATIONAL_AVG_KWH = 297;

// CO2 per kWh in Jordan (grid emission factor)
export const CO2_PER_KWH = 0.71;    // kg — verified from FusionSolar Jordan data
export const COAL_PER_KWH = 0.116;  // kg standard coal equivalent — from FusionSolar
export const CO2_PER_TREE_YEAR = 21; // kg absorbed per tree per year

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
  const tier2Kwh = Math.min(Math.max(kwh - TIER1_LIMIT, 0), TIER2_LIMIT - TIER1_LIMIT);
  const tier3Kwh = Math.max(kwh - TIER2_LIMIT, 0);

  const tier1Cost = tier1Kwh * TIER1_RATE;
  const tier2Cost = tier2Kwh * TIER2_RATE;
  const tier3Cost = tier3Kwh * TIER3_RATE;

  const currentTier: 1 | 2 | 3 = kwh <= TIER1_LIMIT ? 1 : kwh <= TIER2_LIMIT ? 2 : 3;

  return {
    tier1Kwh, tier2Kwh, tier3Kwh,
    tier1Cost, tier2Cost, tier3Cost,
    energyCost: tier1Cost + tier2Cost + tier3Cost,
    currentTier,
  };
}

export interface BillBreakdown {
  energyCost: number;
  fuelClause: number;
  municipalityTax: number;
  tvLicense: number;
  meterRent: number;
  ruralFee: number;
  subsidy: number;
  total: number;
}

export function calcBillBreakdown(kwh: number): BillBreakdown {
  const tiers = calcTierBreakdown(kwh);
  const fuelClause = kwh * FUEL_CLAUSE_PER_KWH;
  // JEPCO formula: base fee + per-kWh rate (reverse-engineered from real bills)
  const municipalityTax = kwh > 0 ? MUNICIPALITY_BASE_JD + kwh * MUNICIPALITY_PER_KWH : 0;
  const ruralFee = kwh * RURAL_FEE_PER_KWH;

  // Government subsidy based on consumption
  let subsidy = 0;
  if (kwh >= 50 && kwh <= 200) subsidy = 2.5;
  else if (kwh > 200 && kwh <= 600) subsidy = 2.0;

  const total = Math.max(
    tiers.energyCost + fuelClause + municipalityTax + TV_LICENSE_JD + METER_RENT_JD + ruralFee - subsidy,
    1.75 // minimum bill
  );

  return {
    energyCost: tiers.energyCost,
    fuelClause,
    municipalityTax,
    tvLicense: TV_LICENSE_JD,
    meterRent: METER_RENT_JD,
    ruralFee,
    subsidy,
    total,
  };
}

export interface FootprintData {
  co2Kg: number;
  coalSavedKg: number;
  treesNeeded: number;
  drivingKm: number;
}

export function calcFootprint(kwh: number): FootprintData {
  const co2Kg = kwh * CO2_PER_KWH;
  return {
    co2Kg,
    coalSavedKg: +(kwh * COAL_PER_KWH).toFixed(1),
    treesNeeded: Math.ceil(co2Kg / CO2_PER_TREE_YEAR),
    drivingKm: Math.round(co2Kg / 0.21),
  };
}
