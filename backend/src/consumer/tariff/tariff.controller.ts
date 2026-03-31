import { Controller, Get, Query } from '@nestjs/common';
import { TariffService } from './tariff.service';

@Controller('api/tariffs')
export class TariffController {
  constructor(private readonly tariffService: TariffService) {}

  @Get('tiers')
  getTiers(@Query('sector') sector?: string) {
    return this.tariffService.getTariffTiers(sector || 'residential_subsidized');
  }

  @Get('sectors')
  getSectors() {
    return this.tariffService.getAllSectors();
  }

  @Get('calculate')
  calculate(
    @Query('kwh') kwh: number,
    @Query('sector') sector?: string,
    @Query('fuelClauseFils') fuelClauseFils?: number,
  ) {
    return this.tariffService.calculateBill(kwh, sector, fuelClauseFils);
  }
}
