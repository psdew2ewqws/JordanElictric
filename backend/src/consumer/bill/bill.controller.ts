import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BillService } from './bill.service';
import { ManualBillDto } from './dto/create-bill.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('api/bills')
@UseGuards(JwtAuthGuard)
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post('manual')
  async createManual(@CurrentUser() user: JwtPayload, @Body() dto: ManualBillDto) {
    return this.billService.createManual(user.sub, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.billService.listByUser(user.sub, limit || 12, offset || 0);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.billService.findById(id, user.sub);
  }
}
