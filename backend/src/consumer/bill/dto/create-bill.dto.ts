import { IsDateString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class ManualBillDto {
  @IsNumber()
  @Min(0)
  totalKwh: number;

  @IsInt()
  @Min(0)
  totalAmountFils: number;

  @IsOptional()
  @IsDateString()
  billingPeriodStart?: string;

  @IsOptional()
  @IsDateString()
  billingPeriodEnd?: string;

  @IsOptional()
  @IsInt()
  previousReading?: number;

  @IsOptional()
  @IsInt()
  currentReading?: number;

  @IsOptional()
  @IsInt()
  fuelClauseFils?: number;
}
