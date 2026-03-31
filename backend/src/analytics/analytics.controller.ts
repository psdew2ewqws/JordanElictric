import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('current-usage')
  async getCurrentUsage(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getCurrentUsage(user.sub);
  }

  @Get('usage')
  async getUsageTrends(
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: 'monthly' | 'quarterly' | 'yearly',
  ) {
    return this.analyticsService.getUsageTrends(user.sub, period || 'monthly');
  }

  @Get('tier-breakdown')
  async getTierBreakdown(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getTierBreakdown(user.sub);
  }

  @Get('comparison')
  async getComparison(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getComparison(user.sub);
  }

  @Get('insights')
  async getInsights(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getInsights(user.sub);
  }
}
