import { Bill, Analytics, TariffTier, User } from '../types';
import { Colors } from '../constants/theme';

export const mockUser: User = {
  id: '1',
  email: 'ahmad@example.com',
  name: 'Ahmad Hassan',
  subscriberNumber: '0123456789',
  distributionCompany: 'JEPCO',
  householdSize: 4,
  language: 'en',
  createdAt: '2025-01-15',
};

export const tariffTiers: TariffTier[] = [
  { tier: 1, minKwh: 1, maxKwh: 300, ratePerKwh: 50, label: 'Tier 1 (1-300 kWh)', labelAr: 'الشريحة 1 (1-300 ك.و.س)', type: 'subsidized' },
  { tier: 2, minKwh: 301, maxKwh: 600, ratePerKwh: 100, label: 'Tier 2 (301-600 kWh)', labelAr: 'الشريحة 2 (301-600 ك.و.س)', type: 'subsidized' },
  { tier: 3, minKwh: 601, maxKwh: 99999, ratePerKwh: 200, label: 'Tier 3 (600+ kWh)', labelAr: 'الشريحة 3 (600+ ك.و.س)', type: 'subsidized' },
];

export const mockCurrentBill: Bill = {
  id: '1',
  userId: '1',
  subscriberNumber: '0123456789',
  billingPeriodStart: '2026-02-01',
  billingPeriodEnd: '2026-02-28',
  dueDate: '2026-03-15',
  totalAmount: 45.8,
  totalKwh: 320,
  source: 'scan',
  lineItems: [
    { id: '1', category: 'energy_tier1', label: 'Tier 1 (1-300 kWh)', labelAr: 'الشريحة 1', amount: 15.0, kwh: 300, ratePerKwh: 50 },
    { id: '2', category: 'energy_tier2', label: 'Tier 2 (301-600 kWh)', labelAr: 'الشريحة 2', amount: 2.0, kwh: 20, ratePerKwh: 100 },
    { id: '3', category: 'fuel_clause', label: 'Fuel Clause Adjustment', labelAr: 'بند الوقود', amount: 12.8 },
    { id: '4', category: 'rural_fee', label: 'Rural Electrification Fee', labelAr: 'رسم الكهربة الريفية', amount: 0.32, kwh: 320, ratePerKwh: 1 },
    { id: '5', category: 'subsidy_deduction', label: 'Subsidy Deduction', labelAr: 'خصم الدعم', amount: -2.5 },
    { id: '6', category: 'tax', label: 'Taxes & Fees', labelAr: 'الضرائب والرسوم', amount: 18.18 },
  ],
  createdAt: '2026-03-01',
};

export const mockAnalytics: Analytics = {
  costPerKwh: 143,
  monthlyTrend: [
    { month: 'Sep', kwh: 240, cost: 22 },
    { month: 'Oct', kwh: 290, cost: 31 },
    { month: 'Nov', kwh: 210, cost: 18 },
    { month: 'Dec', kwh: 180, cost: 15 },
    { month: 'Jan', kwh: 260, cost: 28 },
    { month: 'Feb', kwh: 320, cost: 45.8 },
  ],
  projectedNextBill: 52,
  comparisonToAverage: 30,
  peakOffPeakSplit: { peak: 72, offPeak: 28 },
  tierBreakdown: [
    { tier: 1, kwh: 300, cost: 15.0, ratePerKwh: 50, color: Colors.tierGreen },
    { tier: 2, kwh: 20, cost: 2.0, ratePerKwh: 100, color: Colors.tierYellow },
  ],
  applianceEstimates: [
    { name: 'Air Conditioning', nameAr: 'تكييف', icon: '❄️', percentage: 42, kwhEstimate: 134, color: Colors.danger },
    { name: 'Water Heater', nameAr: 'سخّان الماء', icon: '🚿', percentage: 18, kwhEstimate: 58, color: Colors.warning },
    { name: 'Refrigerator', nameAr: 'الثلاجة', icon: '🧊', percentage: 15, kwhEstimate: 48, color: Colors.chart1 },
    { name: 'Lighting', nameAr: 'الإضاءة', icon: '💡', percentage: 10, kwhEstimate: 32, color: Colors.accent },
    { name: 'Other', nameAr: 'أخرى', icon: '🔌', percentage: 15, kwhEstimate: 48, color: Colors.textMuted },
  ],
  savingsPotential: [
    {
      id: '1',
      title: 'Shift to Off-Peak Hours',
      titleAr: 'انقل استهلاكك لساعات غير الذروة',
      description: 'Run washing machine, dishwasher & AC during 05:00-14:00 to pay less per kWh.',
      descriptionAr: 'شغّل الغسالة وغسالة الصحون والتكييف بين الساعة 5 صباحاً و 2 ظهراً.',
      potentialSavingsJd: 8.5,
      potentialSavingsKwh: 60,
    },
    {
      id: '2',
      title: 'Stay in Tier 1',
      titleAr: 'ابقَ في الشريحة الأولى',
      description: 'Reduce 20 kWh to stay fully in Tier 1 (50 fils/kWh instead of 100 fils/kWh).',
      descriptionAr: 'قلّل 20 ك.و.س لتبقى بالكامل في الشريحة الأولى.',
      potentialSavingsJd: 2.0,
      potentialSavingsKwh: 20,
    },
  ],
  environmentalImpact: {
    co2Kg: 192,
    treesNeeded: 9,
    waterLiters: 640,
    co2ChangeFromLastMonth: 23,
  },
};
