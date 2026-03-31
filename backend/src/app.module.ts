import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConsumerModule } from './consumer/consumer.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 60,  // 60 requests per minute
    }]),

    // Infrastructure
    PrismaModule,
    RedisModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ConsumerModule,
    AiModule,
    AnalyticsModule,
    NotificationModule,
  ],
})
export class AppModule {}
