import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { OpenAIClient } from './clients/openai.client';
import { AnthropicClient } from './clients/anthropic.client';
import { VisionService } from './vision/vision.service';
import { VisionController } from './vision/vision.controller';
import { ConsumerModule } from '../consumer/consumer.module';

@Module({
  imports: [
    MulterModule.register({ storage: 'memory' as any }),
    ConsumerModule,
  ],
  controllers: [VisionController],
  providers: [OpenAIClient, AnthropicClient, VisionService],
  exports: [OpenAIClient, AnthropicClient, VisionService],
})
export class AiModule {}
