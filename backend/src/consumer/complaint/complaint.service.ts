import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComplaintType } from '@prisma/client';

export interface CreateComplaintDto {
  complaintType: ComplaintType;
  description: string;
  descriptionAr?: string;
}

@Injectable()
export class ComplaintService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateComplaintDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('No subscription found');

    const refNumber = `CMP-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.complaint.create({
      data: {
        subscriptionId: subscription.id,
        complaintType: dto.complaintType,
        description: dto.description,
        descriptionAr: dto.descriptionAr || '',
        referenceNumber: refNumber,
      },
    });
  }

  async listByUser(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) return [];

    return this.prisma.complaint.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
