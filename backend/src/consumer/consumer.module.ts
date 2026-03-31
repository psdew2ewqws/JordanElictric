import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription/subscription.controller';
import { SubscriptionService } from './subscription/subscription.service';
import { BillController } from './bill/bill.controller';
import { BillService } from './bill/bill.service';
import { TariffController } from './tariff/tariff.controller';
import { TariffService } from './tariff/tariff.service';
import { ComplaintService } from './complaint/complaint.service';

@Module({
  controllers: [SubscriptionController, BillController, TariffController],
  providers: [SubscriptionService, BillService, TariffService, ComplaintService],
  exports: [SubscriptionService, BillService, TariffService, ComplaintService],
})
export class ConsumerModule {}
