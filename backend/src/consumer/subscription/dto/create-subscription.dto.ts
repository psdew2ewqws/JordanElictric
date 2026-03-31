import { IsEnum, IsInt, IsString, Max, Min, MinLength } from 'class-validator';
import { DistributionCompany } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  @MinLength(1)
  subscriberNumber: string;

  @IsEnum(DistributionCompany)
  distributionCompany: DistributionCompany;

  @IsInt()
  @Min(1)
  @Max(20)
  householdSize: number;
}
