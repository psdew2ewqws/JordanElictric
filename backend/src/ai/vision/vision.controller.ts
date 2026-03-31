import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VisionService } from './vision.service';
import { BillService } from '../../consumer/bill/bill.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class VisionController {
  constructor(
    private readonly visionService: VisionService,
    private readonly billService: BillService,
  ) {}

  @Post('scan-bill')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new BadRequestException('Only image files are allowed'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async scanBill(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const imageBase64 = file.buffer.toString('base64');
    const scanResult = await this.visionService.scanBill(imageBase64);

    // Create bill from scan data
    const bill = await this.billService.createFromScan(user.sub, {
      totalKwh: scanResult.totalKwh,
      totalAmountFils: scanResult.totalAmountFils,
      billingPeriodStart: scanResult.billingPeriodStart,
      billingPeriodEnd: scanResult.billingPeriodEnd,
      previousReading: scanResult.previousReading,
      currentReading: scanResult.currentReading,
      rawOcrData: scanResult as unknown as Record<string, unknown>,
      lineItems: scanResult.lineItems.map((item) => ({
        category: item.category,
        label: item.label,
        labelAr: item.labelAr,
        amountFils: item.amountFils,
        kwh: item.kwh || undefined,
        ratePerKwh: item.ratePerKwh || undefined,
      })),
    });

    return { scanResult, bill };
  }
}
