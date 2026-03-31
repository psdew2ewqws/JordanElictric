import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSubscriptionDto) {
    const existing = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { userId },
          { subscriberNumber: dto.subscriberNumber },
        ],
      },
    });

    if (existing) {
      if (existing.userId === userId) {
        throw new ConflictException('User already has a subscription');
      }
      throw new ConflictException('Subscriber number already registered');
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        subscriberNumber: dto.subscriberNumber,
        distributionCompany: dto.distributionCompany,
        householdSize: dto.householdSize,
      },
    });
  }

  async findByUserId(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!sub) throw new NotFoundException('No subscription found');
    return sub;
  }

  async update(userId: string, data: Partial<CreateSubscriptionDto>) {
    const sub = await this.findByUserId(userId);
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data,
    });
  }
}
