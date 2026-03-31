import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.create(user.sub, dto);
  }

  @Get('me')
  async getMine(@CurrentUser() user: JwtPayload) {
    return this.subscriptionService.findByUserId(user.sub);
  }

  @Patch('me')
  async updateMine(
    @CurrentUser() user: JwtPayload,
    @Body() dto: Partial<CreateSubscriptionDto>,
  ) {
    return this.subscriptionService.update(user.sub, dto);
  }
}
