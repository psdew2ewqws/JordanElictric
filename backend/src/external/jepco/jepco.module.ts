import { Module } from '@nestjs/common';
import { JepcoClient } from './jepco.client';
import { JepcoController } from './jepco.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JepcoController],
  providers: [JepcoClient],
  exports: [JepcoClient],
})
export class JepcoModule {}
