import { Injectable } from '@nestjs/common';
import {
  EMRC_TARIFFS,
  EMRC_DIRECT_SUBSIDY,
  type SectorTariff,
} from '../../common/config/tariff.config';

export interface TierBreakdownItem {
  category: string;
  label: string;
  labelAr: string;
  kwh: number;
  ratePerKwh: number; // fils
  amountFils: number;
}

export interface BillCalculation {
  energyCharges: TierBreakdownItem[];
  fuelClauseFils: number;
  ruralFeeFils: number;
  subsidyDeductionFils: number;
  meterRentFils: number;
  tvLicenseFils: number;
  municipalityTaxFils: number;
  totalFils: number;
}

@Injectable()
export class TariffService {
  /**
   * Calculate the full bill breakdown from kWh consumption.
   * Ported from NAWWAR's _calculate_tiered_cost in optimizer_service.py
   */
  calculateBill(
    totalKwh: number,
    sector: string = 'residential_subsidized',
    fuelClauseFils: number = 0,
  ): BillCalculation {
    const tariff = EMRC_TARIFFS[sector];
    if (!tariff) {
      throw new Error(`Unknown tariff sector: ${sector}`);
    }

    // Calculate energy charges per tier
    const energyCharges = this.calculateTierBreakdown(totalKwh, tariff);
    const totalEnergyFils = energyCharges.reduce((sum, t) => sum + t.amountFils, 0);

    // Fixed charges
    const ruralFeeFils = Math.round(totalKwh * tariff.fixedCharges.ruralDevFeeFilsPerKwh);
    const meterRentFils = tariff.fixedCharges.meterRentFils;
    const tvLicenseFils = tariff.fixedCharges.tvLicenseFils;

    // Direct subsidy (residential subsidized only)
    let subsidyDeductionFils = 0;
    if (sector === 'residential_subsidized') {
      for (const rule of EMRC_DIRECT_SUBSIDY) {
        if (totalKwh >= rule.minKwh && totalKwh <= rule.maxKwh) {
          subsidyDeductionFils = rule.deductionFils;
          break;
        }
      }
    }

    // Municipality tax (10% on energy portion)
    const municipalityTaxFils = Math.round(totalEnergyFils * tariff.municipalityTaxPercent / 100);

    // Total
    const subtotal = totalEnergyFils + fuelClauseFils + ruralFeeFils +
      meterRentFils + tvLicenseFils + municipalityTaxFils - subsidyDeductionFils;

    const totalFils = Math.max(subtotal, tariff.minimumMonthlyFils);

    return {
      energyCharges,
      fuelClauseFils,
      ruralFeeFils,
      subsidyDeductionFils,
      meterRentFils,
      tvLicenseFils,
      municipalityTaxFils,
      totalFils,
    };
  }

  private calculateTierBreakdown(totalKwh: number, tariff: SectorTariff): TierBreakdownItem[] {
    const result: TierBreakdownItem[] = [];
    let remainingKwh = totalKwh;

    for (const tier of tariff.tiers) {
      if (remainingKwh <= 0) break;

      const tierRange = tier.maxKwh - tier.minKwh + 1;
      const kwhInTier = Math.min(remainingKwh, tierRange);
      const amountFils = Math.round(kwhInTier * tier.rateFils);

      result.push({
        category: `energy_tier${tier.tier}`,
        label: tier.label,
        labelAr: tier.labelAr,
        kwh: kwhInTier,
        ratePerKwh: tier.rateFils,
        amountFils,
      });

      remainingKwh -= kwhInTier;
    }

    return result;
  }

  getTariffTiers(sector: string = 'residential_subsidized') {
    const tariff = EMRC_TARIFFS[sector];
    if (!tariff) return [];
    return tariff.tiers;
  }

  getAllSectors() {
    return Object.keys(EMRC_TARIFFS);
  }
}
