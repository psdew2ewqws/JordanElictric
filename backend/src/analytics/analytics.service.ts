import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TariffService } from '../consumer/tariff/tariff.service';
import {
  ENVIRONMENTAL_FACTORS,
  APPLIANCE_PROFILES,
} from '../common/config/tariff.config';

@Injectable()
export class AnalyticsService {
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private tariffService: TariffService,
  ) {}

  /**
   * Current usage summary for the Home screen.
   */
  async getCurrentUsage(userId: string) {
    const cacheKey = `analytics:current:${userId}`;
    const cached = await this.redis.getJson<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('No subscription found');

    const latestBill = await this.prisma.bill.findFirst({
      where: { subscriptionId: subscription.id },
      orderBy: { billingPeriodEnd: 'desc' },
      include: { lineItems: true },
    });

    if (!latestBill) {
      return {
        currentKwh: 0,
        currentAmountJd: 0,
        tierProgress: { tier: 1, percentage: 0, label: 'No data yet' },
        billingPeriod: null,
      };
    }

    const kwh = Number(latestBill.totalKwh);
    const tier = kwh <= 300 ? 1 : kwh <= 600 ? 2 : 3;
    const tierMax = tier === 1 ? 300 : tier === 2 ? 600 : 1000;
    const tierMin = tier === 1 ? 0 : tier === 2 ? 300 : 600;
    const percentage = Math.min(100, Math.round(((kwh - tierMin) / (tierMax - tierMin)) * 100));

    const result = {
      currentKwh: kwh,
      currentAmountJd: latestBill.totalAmountFils / 1000,
      tierProgress: {
        tier,
        percentage,
        label: tier === 1
          ? 'Still in Tier 1 — cheapest rate'
          : tier === 2
            ? 'In Tier 2 — moderate rate'
            : 'In Tier 3 — highest rate',
      },
      billingPeriod: {
        start: latestBill.billingPeriodStart,
        end: latestBill.billingPeriodEnd,
        dueDate: latestBill.dueDate,
      },
    };

    await this.redis.setJson(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Usage trends for the Usage screen (monthly/quarterly/yearly).
   */
  async getUsageTrends(userId: string, period: 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) return { trend: [], average: 0 };

    const limit = period === 'monthly' ? 6 : period === 'quarterly' ? 4 : 3;

    const bills = await this.prisma.bill.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { billingPeriodEnd: 'asc' },
      take: limit,
      select: {
        billingPeriodEnd: true,
        totalKwh: true,
        totalAmountFils: true,
      },
    });

    const trend = bills.map((b) => ({
      date: b.billingPeriodEnd,
      kwh: Number(b.totalKwh),
      costJd: b.totalAmountFils / 1000,
    }));

    const average = trend.length > 0
      ? Math.round(trend.reduce((sum, t) => sum + t.kwh, 0) / trend.length)
      : 0;

    return { trend, average };
  }

  /**
   * Tier breakdown for the current bill.
   */
  async getTierBreakdown(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) return { tiers: [], totalEnergyChargeFils: 0 };

    const latestBill = await this.prisma.bill.findFirst({
      where: { subscriptionId: subscription.id },
      orderBy: { billingPeriodEnd: 'desc' },
    });

    if (!latestBill) return { tiers: [], totalEnergyChargeFils: 0 };

    const kwh = Number(latestBill.totalKwh);
    const calculation = this.tariffService.calculateBill(kwh, 'residential_subsidized');

    const tiers = calculation.energyCharges.map((tier) => ({
      ...tier,
      costJd: tier.amountFils / 1000,
      color: tier.category === 'energy_tier1' ? '#059669'
        : tier.category === 'energy_tier2' ? '#D97706'
          : '#DC2626',
    }));

    return {
      totalKwh: kwh,
      tiers,
      totalEnergyChargeFils: calculation.energyCharges.reduce((s, t) => s + t.amountFils, 0),
    };
  }

  /**
   * Month-over-month comparison.
   */
  async getComparison(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) return null;

    const bills = await this.prisma.bill.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { billingPeriodEnd: 'desc' },
      take: 2,
    });

    if (bills.length < 2) return null;

    const [current, previous] = bills;
    const currKwh = Number(current.totalKwh);
    const prevKwh = Number(previous.totalKwh);
    const currCost = current.totalAmountFils;
    const prevCost = previous.totalAmountFils;

    return {
      consumption: {
        current: currKwh,
        previous: prevKwh,
        diff: currKwh - prevKwh,
        percentChange: prevKwh > 0 ? Math.round(((currKwh - prevKwh) / prevKwh) * 100) : 0,
      },
      cost: {
        currentJd: currCost / 1000,
        previousJd: prevCost / 1000,
        diffJd: (currCost - prevCost) / 1000,
        percentChange: prevCost > 0 ? Math.round(((currCost - prevCost) / prevCost) * 100) : 0,
      },
      avgCost: {
        currentFils: currKwh > 0 ? Math.round(currCost / currKwh) : 0,
        previousFils: prevKwh > 0 ? Math.round(prevCost / prevKwh) : 0,
      },
    };
  }

  /**
   * Full insights for the Insights screen.
   */
  async getInsights(userId: string) {
    const cacheKey = `analytics:insights:${userId}`;
    const cached = await this.redis.getJson<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('No subscription found');

    const bills = await this.prisma.bill.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { billingPeriodEnd: 'desc' },
      take: 6,
    });

    const latestBill = bills[0];
    if (!latestBill) {
      return { costPerKwh: 0, projectedNextBill: 0, comparisonToAverage: 0, applianceEstimates: [] };
    }

    const kwh = Number(latestBill.totalKwh);
    const amountFils = latestBill.totalAmountFils;

    // Cost per kWh (in fils)
    const costPerKwh = kwh > 0 ? Math.round(amountFils / kwh) : 0;

    // Projected next bill (simple: average of last 3 * trend factor)
    const recentBills = bills.slice(0, 3);
    const avgCost = recentBills.reduce((s, b) => s + b.totalAmountFils, 0) / recentBills.length;
    const projectedNextBillJd = Math.round(avgCost * 1.05) / 1000; // slight upward trend

    // vs national average (297 kWh/month for Jordan)
    const nationalAvgKwh = 297;
    const comparisonToAverage = Math.round(((kwh - nationalAvgKwh) / nationalAvgKwh) * 100);

    // Peak/off-peak split
    const peakKwh = Number(latestBill.peakKwh);
    const offPeakKwh = Number(latestBill.offPeakKwh);
    const totalPeakOff = peakKwh + offPeakKwh;
    const peakPercent = totalPeakOff > 0 ? Math.round((peakKwh / totalPeakOff) * 100) : 72;
    const offPeakPercent = 100 - peakPercent;

    // Appliance estimates (scaled to actual kWh)
    const applianceEstimates = APPLIANCE_PROFILES.map((a) => ({
      name: a.name,
      nameAr: a.nameAr,
      icon: a.icon,
      estimatedKwh: Math.round(kwh * a.percentOfTotal),
      percentage: Math.round(a.percentOfTotal * 100),
    }));

    // Environmental impact
    const co2Kg = Math.round(kwh * ENVIRONMENTAL_FACTORS.co2KgPerKwh);
    const treesNeeded = Math.ceil(co2Kg / ENVIRONMENTAL_FACTORS.treeCo2OffsetKgPerYear);
    const waterLiters = Math.round(kwh * ENVIRONMENTAL_FACTORS.waterLitersPerKwh);

    // CO2 change from last month
    const prevBill = bills[1];
    const prevKwh = prevBill ? Number(prevBill.totalKwh) : kwh;
    const prevCo2 = Math.round(prevKwh * ENVIRONMENTAL_FACTORS.co2KgPerKwh);
    const co2Change = co2Kg - prevCo2;

    const result = {
      costPerKwh,
      projectedNextBillJd,
      comparisonToAverage,
      peakOffPeakSplit: { peak: peakPercent, offPeak: offPeakPercent },
      applianceEstimates,
      environmentalImpact: {
        co2Kg,
        treesNeeded,
        waterLiters,
        co2ChangeFromLastMonth: co2Change,
      },
    };

    await this.redis.setJson(cacheKey, result, this.CACHE_TTL);
    return result;
  }
}
