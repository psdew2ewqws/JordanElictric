import { Controller, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { JepcoClient } from './jepco.client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/jepco')
@UseGuards(JwtAuthGuard)
export class JepcoController {
  constructor(
    private readonly jepco: JepcoClient,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get the user's subscriber number from their subscription.
   */
  private async getFileNumber(userId: string): Promise<string> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true },
    });
    if (!sub?.subscriberNumber) {
      throw new HttpException('No active subscription found. Please add your subscriber number first.', HttpStatus.NOT_FOUND);
    }
    return sub.subscriberNumber;
  }

  @Get('smart-meter')
  async getSmartMeter(@CurrentUser() user: JwtPayload) {
    const fileNumber = await this.getFileNumber(user.sub);
    const data = await this.jepco.fetchSmartMeter(fileNumber);
    if (!data) {
      throw new HttpException('Smart meter data not available', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { fileNumber, data };
  }

  @Get('bills')
  async getBills(@CurrentUser() user: JwtPayload) {
    const fileNumber = await this.getFileNumber(user.sub);
    const data = await this.jepco.fetchBills(fileNumber);
    if (!data) {
      throw new HttpException('Bills not available', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { fileNumber, data };
  }

  @Get('subscriber-info')
  async getSubscriberInfo(@CurrentUser() user: JwtPayload) {
    const fileNumber = await this.getFileNumber(user.sub);
    const data = await this.jepco.fetchSapInfo(fileNumber);
    if (!data) {
      throw new HttpException('Subscriber info not available', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { fileNumber, data };
  }

  @Get('comparison')
  async getComparison(@CurrentUser() user: JwtPayload) {
    const fileNumber = await this.getFileNumber(user.sub);
    const data = await this.jepco.fetchComparison(fileNumber);
    if (!data) {
      throw new HttpException('Comparison data not available', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { fileNumber, data };
  }

  @Get('bill-header')
  async getBillHeader(@CurrentUser() user: JwtPayload) {
    const fileNumber = await this.getFileNumber(user.sub);
    const data = await this.jepco.fetchBillHeader(fileNumber);
    if (!data) {
      throw new HttpException('Bill header not available', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { fileNumber, data };
  }

  @Get('account-statement')
  async getAccountStatement(@CurrentUser() user: JwtPayload) {
    const fileNumber = await this.getFileNumber(user.sub);
    const data = await this.jepco.fetchAccountStatement(fileNumber);
    if (!data) {
      throw new HttpException('Account statement not available', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { fileNumber, data };
  }

  @Get('account-summary')
  async getAccountSummary(@CurrentUser() user: JwtPayload) {
    const fileNumber = await this.getFileNumber(user.sub);
    const data = await this.jepco.fetchAllData(fileNumber);
    return { fileNumber, ...data };
  }
}
