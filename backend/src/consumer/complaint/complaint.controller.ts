import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import type { CreateComplaintDto } from './complaint.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('api/complaints')
@UseGuards(JwtAuthGuard)
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateComplaintDto) {
    return this.complaintService.create(user.sub, dto);
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.complaintService.listByUser(user.sub);
  }
}
