/**
 * Demo data generator — produces realistic JEPCO-shaped responses.
 * Every response matches the exact shape the real JEPCO API returns,
 * so the app cannot tell the difference.
 */

import { calcTierBreakdown, calcBillBreakdown } from "./tariff-calc.ts";

// Seed a deterministic but varied random from file number
function seededRand(fileNumber: string, salt = 0): number {
  let hash = salt;
  for (let i = 0; i < fileNumber.length; i++) {
    hash = (hash * 31 + fileNumber.charCodeAt(i)) & 0x7fffffff;
  }
  return (hash % 1000) / 1000;
}

function rand(min: number, max: number, fileNumber: string, salt = 0): number {
  return min + seededRand(fileNumber, salt) * (max - min);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── Smart Meter ───────────────────────────────────────────
export function generateSmartMeter(fileNumber: string, householdSize: number) {
  const baseDaily = householdSize * rand(4, 8, fileNumber, 1);
  const month = new Date().getMonth(); // 0-11
  // Summer boost (Jun-Sep)
  const seasonMultiplier = month >= 5 && month <= 8 ? 1.4 : month >= 11 || month <= 1 ? 1.2 : 1.0;
  const dailyKwh = baseDaily * seasonMultiplier;

  const dayOfMonth = new Date().getDate();
  const daysInCycle = 30;
  const currentKwh = Math.round(dailyKwh * dayOfMonth);
  const expectedKwh = Math.round(dailyKwh * daysInCycle);

  const tiers = calcTierBreakdown(expectedKwh);
  const bill = calcBillBreakdown(expectedKwh);
  const currentBill = calcBillBreakdown(currentKwh);

  // Generate daily consumption list for the chart
  const consumptionMonthlyList: { date: string; consumptionAtDate: string }[] = [];
  for (let i = dayOfMonth; i >= 1; i--) {
    const dayDate = daysAgo(dayOfMonth - i);
    const variation = 0.7 + seededRand(fileNumber, i * 100) * 0.6; // 0.7-1.3x
    const isWeekend = [0, 5, 6].includes(new Date(dayDate).getDay()); // Fri, Sat, Sun
    const weekendBoost = isWeekend ? 1.15 : 1.0;
    consumptionMonthlyList.push({
      date: dayDate,
      consumptionAtDate: (dailyKwh * variation * weekendBoost).toFixed(1),
    });
  }

  const lastMonthKwh = Math.round(expectedKwh * rand(0.85, 1.15, fileNumber, 2));
  const lastYearKwh = Math.round(expectedKwh * rand(0.75, 1.25, fileNumber, 3));
  const lastBillReading = Math.round(rand(10000, 50000, fileNumber, 4));

  return {
    showSmartMeterFeature: true,
    currentElectricityConsumptionQuntity: currentKwh.toString(),
    expectedElectricityConsumptionQuntity: expectedKwh.toString(),
    currentElectricityConsumptionValue: currentBill.total.toFixed(3),
    expectedElectricityEndofMonthBillAmount: bill.total.toFixed(3),
    lastBillReading: lastBillReading.toString(),
    currentReading: (lastBillReading + currentKwh).toString(),
    lastBillReadingDate: daysAgo(dayOfMonth),
    numberOfConsumptionDaysSinceLastRead: dayOfMonth.toString(),
    consumptionMonthlyList,
    comparazinConsumption: {
      lastMonthconsumption: lastMonthKwh.toString(),
      lastYearconsumption: lastYearKwh.toString(),
    },
  };
}

// ─── SAP Info (subscriber validation) ──────────────────────
export function generateSapInfo(fileNumber: string) {
  const names = [
    { first: "أحمد", last: "العبادي" },
    { first: "محمد", last: "الخطيب" },
    { first: "فاطمة", last: "النعيمات" },
    { first: "سارة", last: "الحسن" },
    { first: "عمر", last: "الزعبي" },
  ];
  const nameIdx = Math.floor(seededRand(fileNumber, 10) * names.length);
  const name = names[nameIdx];
  const meterNum = "M" + fileNumber.slice(2, 10);

  return {
    firstName: name.first,
    familyName: name.last,
    fullName: `${name.first} ${name.last}`,
    meterNumber: meterNum,
    deviceCategoryAdditionalType: "عداد ذكي",
    subscriptionDescription: "سكني مدعوم",
    officeDescription: "مكتب عمان الأول",
    receivableAmount: (rand(0, 50, fileNumber, 11) * 1000).toFixed(0),
    subsidy_Flag: "Y",
    status: "نشط",
    fileNumber,
  };
}

// ─── Bills ─────────────────────────────────────────────────
export function generateBills(fileNumber: string, householdSize: number) {
  const bills = [];
  const baseKwh = householdSize * rand(120, 220, fileNumber, 20);

  for (let i = 0; i < 12; i++) {
    const month = new Date().getMonth() - i;
    const year = new Date().getFullYear() + Math.floor((new Date().getMonth() - i) / 12);
    const adjustedMonth = ((month % 12) + 12) % 12;

    // Seasonal variation
    const seasonal = adjustedMonth >= 5 && adjustedMonth <= 8 ? 1.4 : adjustedMonth >= 11 || adjustedMonth <= 1 ? 1.2 : 1.0;
    const variation = 0.85 + seededRand(fileNumber, 30 + i) * 0.3;
    const kwh = Math.round(baseKwh * seasonal * variation);
    const bill = calcBillBreakdown(kwh);

    const periodEnd = new Date(year, adjustedMonth + 1, 0);
    const periodStart = new Date(year, adjustedMonth, 1);

    bills.push({
      billPeriod: `${periodStart.toISOString().slice(0, 10)} - ${periodEnd.toISOString().slice(0, 10)}`,
      ibillingQuantity: kwh.toString(),
      totalBillAmount: (bill.total * 1000).toFixed(0), // in fils
      totalBillAmountJd: bill.total.toFixed(3),
      clearingStatus: i > 1 ? "مسدد" : i === 1 ? "غير مسدد" : "فاتورة حالية",
      isPaid: i > 1,
      billingPeriodStart: periodStart.toISOString().slice(0, 10),
      billingPeriodEnd: periodEnd.toISOString().slice(0, 10),
      previousReading: (10000 + (12 - i) * Math.round(baseKwh)).toString(),
      currentReading: (10000 + (13 - i) * Math.round(baseKwh)).toString(),
    });
  }

  return { allBillsDetails: bills };
}

// ─── Comparison ────────────────────────────────────────────
export function generateComparison(fileNumber: string, householdSize: number) {
  const currentKwh = Math.round(householdSize * rand(120, 220, fileNumber, 40));
  const lastMonthKwh = Math.round(currentKwh * rand(0.85, 1.15, fileNumber, 41));
  const lastYearKwh = Math.round(currentKwh * rand(0.75, 1.25, fileNumber, 42));

  return {
    currentMonthConsumption: currentKwh.toString(),
    lastMonthconsumption: lastMonthKwh.toString(),
    lastYearconsumption: lastYearKwh.toString(),
    changeFromLastMonth: (((currentKwh - lastMonthKwh) / lastMonthKwh) * 100).toFixed(1),
    changeFromLastYear: (((currentKwh - lastYearKwh) / lastYearKwh) * 100).toFixed(1),
  };
}

// ─── Bill Header ───────────────────────────────────────────
export function generateBillHeader(fileNumber: string, householdSize: number) {
  const kwh = Math.round(householdSize * rand(120, 220, fileNumber, 50));
  const bill = calcBillBreakdown(kwh);
  const tiers = calcTierBreakdown(kwh);

  return {
    fileNumber,
    totalAmount: (bill.total * 1000).toFixed(0),
    totalAmountJd: bill.total.toFixed(3),
    totalKwh: kwh.toString(),
    tier1Kwh: tiers.tier1Kwh.toString(),
    tier2Kwh: tiers.tier2Kwh.toString(),
    tier3Kwh: tiers.tier3Kwh.toString(),
    energyCharge: (tiers.energyCost * 1000).toFixed(0),
    fuelSurcharge: Math.round(kwh * 10).toString(), // ~10 fils/kWh
    municipalityTax: (bill.municipalityTax * 1000).toFixed(0),
    tvFee: "1000",
    meterRent: "200",
    subsidy: (bill.subsidy * 1000).toFixed(0),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  };
}

// ─── Account Statement ─────────────────────────────────────
export function generateAccountStatement(fileNumber: string) {
  const statements = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const amount = (rand(15, 60, fileNumber, 60 + i) * 1000).toFixed(0);

    statements.push({
      date: date.toISOString().slice(0, 10),
      description: i === 0 ? "فاتورة حالية" : "دفعة",
      debit: i % 2 === 0 ? amount : "0",
      credit: i % 2 === 1 ? amount : "0",
      balance: (rand(0, 30, fileNumber, 70 + i) * 1000).toFixed(0),
    });
  }
  return { statements };
}

// ─── Simulate Consumption ──────────────────────────────────
export function generateSimulation(fileNumber: string, kwh?: number) {
  const simKwh = kwh || Math.round(rand(200, 500, fileNumber, 80));
  const bill = calcBillBreakdown(simKwh);
  const tiers = calcTierBreakdown(simKwh);

  return {
    simulatedKwh: simKwh,
    estimatedBillJd: bill.total.toFixed(3),
    tierBreakdown: {
      tier1: { kwh: tiers.tier1Kwh, cost: tiers.tier1Cost.toFixed(3) },
      tier2: { kwh: tiers.tier2Kwh, cost: tiers.tier2Cost.toFixed(3) },
      tier3: { kwh: tiers.tier3Kwh, cost: tiers.tier3Cost.toFixed(3) },
    },
    totalEnergyCost: tiers.energyCost.toFixed(3),
    fixedCharges: (bill.meterRent + bill.tvLicense + bill.ruralFee).toFixed(3),
    subsidy: bill.subsidy.toFixed(3),
  };
}

// ─── Router: returns demo data for any endpoint ────────────
export function getDemoData(
  endpoint: string,
  fileNumber: string,
  householdSize: number
): unknown {
  switch (endpoint) {
    case "smart_meter":
      return generateSmartMeter(fileNumber, householdSize);
    case "sap_info":
      return generateSapInfo(fileNumber);
    case "bills":
      return generateBills(fileNumber, householdSize);
    case "comparison":
      return generateComparison(fileNumber, householdSize);
    case "bill_header":
      return generateBillHeader(fileNumber, householdSize);
    case "statement":
      return generateAccountStatement(fileNumber);
    case "simulate":
      return generateSimulation(fileNumber);
    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
}
