import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(helmet());
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`The dungeon gate creaks open on http://localhost:${port}`);
}
bootstrap();
