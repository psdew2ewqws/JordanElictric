import { Module } from '@nestjs/common';
import { JepcoClient } from './jepco.client';
import { JepcoController } from './jepco.controller';
import { JepcoProxyController } from './jepco-proxy.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [JepcoController, JepcoProxyController],
  providers: [JepcoClient],
  exports: [JepcoClient],
})
export class JepcoModule {}
