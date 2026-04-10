export interface User {
  id: string;
  email: string;
  name: string;
  subscriberNumber: string;
  distributionCompany: 'JEPCO' | 'EDCO' | 'IDECO';
  householdSize: number;
  language: 'ar' | 'en';
  createdAt: string;
}

export interface Bill {
  id: string;
  userId: string;
  subscriberNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  totalAmount: number;
  totalKwh: number;
  source: 'scan' | 'manual';
  lineItems: BillLineItem[];
  createdAt: string;
}

export interface BillLineItem {
  id: string;
  category: 'energy_tier1' | 'energy_tier2' | 'energy_tier3' | 'fuel_clause' | 'rural_fee' | 'subsidy_deduction' | 'tax' | 'other';
  label: string;
  labelAr: string;
  amount: number;
  kwh?: number;
  ratePerKwh?: number;
}

export interface TariffTier {
  tier: number;
  minKwh: number;
  maxKwh: number;
  ratePerKwh: number; // in fils
  label: string;
  labelAr: string;
  type: 'subsidized' | 'non_subsidized';
}

export interface Analytics {
  costPerKwh: number;
  monthlyTrend: MonthlyDataPoint[];
  projectedNextBill: number;
  comparisonToAverage: number; // percentage
  peakOffPeakSplit: { peak: number; offPeak: number };
  tierBreakdown: TierUsage[];
  applianceEstimates: ApplianceEstimate[];
  savingsPotential: SavingsTip[];
  environmentalImpact: EnvironmentalImpact;
}

export interface MonthlyDataPoint {
  month: string;
  kwh: number;
  cost: number;
}

export interface TierUsage {
  tier: number;
  kwh: number;
  cost: number;
  ratePerKwh: number;
  color: string;
}

export interface ApplianceEstimate {
  name: string;
  nameAr: string;
  icon: string;
  percentage: number;
  kwhEstimate: number;
  color: string;
}

export interface SavingsTip {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  potentialSavingsJd: number;
  potentialSavingsKwh: number;
}

export interface EnvironmentalImpact {
  co2Kg: number;
  treesNeeded: number;
  coalSavedKg: number;
  drivingKm: number;
  co2ChangeFromLastMonth: number;
}
