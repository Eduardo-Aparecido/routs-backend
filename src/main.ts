import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

let cachedApp: any;

async function createApp() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') || 'http://localhost:5173',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();

  return app;
}

async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') || 3000;

  await app.listen(port);

  console.log(`ROUTS API running at http://localhost:${port}`);
}

if (process.env.VERCEL) {
  module.exports = async (req: any, res: any) => {
    if (!cachedApp) {
      cachedApp = createApp();
    }

    const app = await cachedApp;
    const server = app.getHttpAdapter().getInstance();

    return server(req, res);
  };
} else {
  bootstrap();
}