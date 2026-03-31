import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OpenAIClient } from '../clients/openai.client';
import { BILL_EXTRACTION_PROMPT } from '../prompts/bill-scanner.prompt';

export interface BillScanResult {
  subscriberNumber: string;
  subscriberName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  previousReading: number;
  currentReading: number;
  totalKwh: number;
  peakKwh: number | null;
  offPeakKwh: number | null;
  totalAmountFils: number;
  lineItems: {
    category: string;
    label: string;
    labelAr: string;
    amountFils: number;
    kwh: number | null;
    ratePerKwh: number | null;
  }[];
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);

  constructor(private openai: OpenAIClient) {}

  /**
   * Scan a bill image and extract structured data.
   * Ported from NAWWAR's vision_service.py scan_bill
   */
  async scanBill(imageBase64: string): Promise<BillScanResult> {
    const rawResponse = await this.openai.visionExtract(imageBase64, BILL_EXTRACTION_PROMPT);

    // Parse JSON from response (may be wrapped in markdown code block)
    let parsed: Record<string, unknown>;
    try {
      const jsonStr = rawResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      this.logger.error(`Failed to parse OCR response: ${rawResponse.substring(0, 200)}`);
      throw new BadRequestException('Could not parse bill data from image');
    }

    // Validate required fields
    const result = this.validateAndMap(parsed);
    return result;
  }

  /**
   * Validate OCR output and map to typed result.
   * Ported from NAWWAR's validate_bill_scan in output_validator.py
   */
  private validateAndMap(data: Record<string, unknown>): BillScanResult {
    const requiredFields = ['total_kwh', 'total_amount_fils', 'billing_period_start', 'billing_period_end'];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new BadRequestException(`Missing required field from scan: ${field}`);
      }
    }

    const totalKwh = Number(data['total_kwh']);
    const totalAmountFils = Number(data['total_amount_fils']);

    if (isNaN(totalKwh) || totalKwh < 0 || totalKwh > 100000) {
      throw new BadRequestException('Invalid total_kwh value');
    }
    if (isNaN(totalAmountFils) || totalAmountFils < 0) {
      throw new BadRequestException('Invalid total_amount_fils value');
    }

    const rawLineItems = Array.isArray(data['line_items']) ? data['line_items'] : [];
    const lineItems = (rawLineItems as Record<string, unknown>[]).map((item) => ({
      category: String(item['category'] || 'other'),
      label: String(item['label'] || ''),
      labelAr: String(item['label_ar'] || ''),
      amountFils: Number(item['amount_fils'] || 0),
      kwh: item['kwh'] != null ? Number(item['kwh']) : null,
      ratePerKwh: item['rate_per_kwh'] != null ? Number(item['rate_per_kwh']) : null,
    }));

    return {
      subscriberNumber: String(data['subscriber_number'] || ''),
      subscriberName: String(data['subscriber_name'] || ''),
      billingPeriodStart: String(data['billing_period_start']),
      billingPeriodEnd: String(data['billing_period_end']),
      previousReading: Number(data['previous_reading'] || 0),
      currentReading: Number(data['current_reading'] || 0),
      totalKwh,
      peakKwh: data['peak_kwh'] != null ? Number(data['peak_kwh']) : null,
      offPeakKwh: data['off_peak_kwh'] != null ? Number(data['off_peak_kwh']) : null,
      totalAmountFils,
      lineItems,
    };
  }
}
