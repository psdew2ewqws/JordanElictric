import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: {
    type: NotificationType;
    title: string;
    titleAr?: string;
    message: string;
    messageAr?: string;
    relatedObjectType?: string;
    relatedObjectId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId,
        notificationType: data.type,
        title: data.title,
        titleAr: data.titleAr || '',
        message: data.message,
        messageAr: data.messageAr || '',
        relatedObjectType: data.relatedObjectType || '',
        relatedObjectId: data.relatedObjectId,
      },
    });
  }

  async listByUser(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
