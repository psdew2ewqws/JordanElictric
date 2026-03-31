import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query('limit') limit?: number) {
    return this.notificationService.listByUser(user.sub, limit || 20);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationService.getUnreadCount(user.sub);
    return { count };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.notificationService.markAsRead(user.sub, id);
    return { message: 'Marked as read' };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.notificationService.markAllRead(user.sub);
    return { message: 'All marked as read' };
  }
}
