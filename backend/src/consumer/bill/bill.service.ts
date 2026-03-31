import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TariffService } from '../tariff/tariff.service';
import { ManualBillDto } from './dto/create-bill.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillService {
  constructor(
    private prisma: PrismaService,
    private tariffService: TariffService,
  ) {}

  /**
   * Create a bill from manual entry.
   * Ported from NAWWAR's bill_create in apps/consumer/services.py
   */
  async createManual(userId: string, dto: ManualBillDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('No subscription found');

    // Calculate tier breakdown from kWh
    const calculation = this.tariffService.calculateBill(
      dto.totalKwh,
      'residential_subsidized',
      dto.fuelClauseFils || 0,
    );

    // Default billing period: current month
    const now = new Date();
    const periodStart = dto.billingPeriodStart
      ? new Date(dto.billingPeriodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = dto.billingPeriodEnd
      ? new Date(dto.billingPeriodEnd)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 15);

    // Use provided amount or calculated total
    const totalAmountFils = dto.totalAmountFils || calculation.totalFils;

    const bill = await this.prisma.bill.create({
      data: {
        subscriptionId: subscription.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        dueDate,
        totalAmountFils,
        totalKwh: dto.totalKwh,
        previousReading: dto.previousReading || 0,
        currentReading: dto.currentReading || 0,
        source: 'MANUAL',
        lineItems: {
          create: [
            // Energy tier charges
            ...calculation.energyCharges.map((tier) => ({
              category: tier.category,
              label: tier.label,
              labelAr: tier.labelAr,
              amountFils: tier.amountFils,
              kwh: tier.kwh,
              ratePerKwh: tier.ratePerKwh,
              tariffTier: tier.category,
            })),
            // Fuel clause
            ...(calculation.fuelClauseFils > 0
              ? [{
                  category: 'fuel_clause',
                  label: 'Fuel Clause Adjustment',
                  labelAr: 'بند الوقود',
                  amountFils: calculation.fuelClauseFils,
                  kwh: 0,
                }]
              : []),
            // Rural fee
            {
              category: 'rural_fee',
              label: 'Rural Electrification Fee',
              labelAr: 'رسم كهربة الريف',
              amountFils: calculation.ruralFeeFils,
              kwh: dto.totalKwh,
              ratePerKwh: 1,
            },
            // Subsidy deduction
            ...(calculation.subsidyDeductionFils > 0
              ? [{
                  category: 'subsidy_deduction',
                  label: 'Direct Subsidy',
                  labelAr: 'الدعم المباشر',
                  amountFils: -calculation.subsidyDeductionFils,
                  kwh: 0,
                }]
              : []),
            // Municipality tax
            {
              category: 'tax',
              label: 'Municipality Tax (10%)',
              labelAr: 'ضريبة البلدية (10%)',
              amountFils: calculation.municipalityTaxFils,
              kwh: 0,
            },
          ],
        },
      },
      include: { lineItems: true },
    });

    return bill;
  }

  /**
   * Create a bill from OCR scan data.
   * Ported from NAWWAR's bill_create_from_scan
   */
  async createFromScan(
    userId: string,
    scanData: {
      totalKwh: number;
      totalAmountFils: number;
      billingPeriodStart: string;
      billingPeriodEnd: string;
      previousReading?: number;
      currentReading?: number;
      scannedImageUrl?: string;
      rawOcrData?: Record<string, unknown>;
      lineItems?: {
        category: string;
        label: string;
        labelAr?: string;
        amountFils: number;
        kwh?: number;
        ratePerKwh?: number;
      }[];
    },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('No subscription found');

    const periodStart = new Date(scanData.billingPeriodStart);
    const periodEnd = new Date(scanData.billingPeriodEnd);
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 15);

    const bill = await this.prisma.bill.create({
      data: {
        subscriptionId: subscription.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        dueDate,
        totalAmountFils: scanData.totalAmountFils,
        totalKwh: scanData.totalKwh,
        previousReading: scanData.previousReading || 0,
        currentReading: scanData.currentReading || 0,
        source: 'SCAN',
        scannedImageUrl: scanData.scannedImageUrl,
        rawOcrData: (scanData.rawOcrData as Prisma.InputJsonValue | undefined),
        lineItems: scanData.lineItems
          ? {
              create: scanData.lineItems.map((item) => ({
                category: item.category,
                label: item.label,
                labelAr: item.labelAr || '',
                amountFils: item.amountFils,
                kwh: item.kwh || 0,
                ratePerKwh: item.ratePerKwh,
              })),
            }
          : undefined,
      },
      include: { lineItems: true },
    });

    return bill;
  }

  async findById(billId: string, userId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: billId,
        subscription: { userId },
      },
      include: { lineItems: true },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  async listByUser(userId: string, limit = 12, offset = 0) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) return { bills: [], total: 0 };

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where: { subscriptionId: subscription.id },
        include: { lineItems: true },
        orderBy: { billingPeriodEnd: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.bill.count({
        where: { subscriptionId: subscription.id },
      }),
    ]);

    return { bills, total };
  }
}
