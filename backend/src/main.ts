import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { validationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global pipes & filters
  app.useGlobalPipes(validationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS for mobile app
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger API docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('JordanElectric API')
    .setDescription('Backend API for the Diaa electricity consumer app')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
