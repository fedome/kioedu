// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { SentryInterceptor } from './core/interceptors/sentry.interceptor';
// import helmet from 'helmet'; // 👉 Por ahora lo apagamos, después lo volvemos a encender

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { PrismaService } from './prisma/prisma.service';
import helmet from 'helmet';

const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  // Inicializamos Sentry de forma temprana (si la variable de entorno está presente)
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    });
  }

  const app = await NestFactory.create(AppModule);

  if (process.env.SENTRY_DSN) {
    app.useGlobalInterceptors(new SentryInterceptor());
  }

  app.enableCors(
    isProd
      ? {
        origin: [
          'capacitor://localhost',
          'https://padres.KioEdu.com',
          // 'https://otra-url-que-uses.com',
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Authorization, X-Kiosk-Key', // Agregamos X-Kiosk-Key
      }
      : {
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: '*',
      },
  );

  // Helmet activado en producción para seguridad básica (Headers de protección)
  if (isProd) {
    app.use(
      helmet({
        crossOriginResourcePolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
      }),
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  // --- Swagger sólo fuera de producción ---
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('KioEdu API')
      .setDescription('NestJS 11 + Prisma + PostgreSQL')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Authorization: Bearer <token>',
        },
        'JWT',
      )
      .addTag('Health')
      .addTag('Auth')
      .addTag('Accounts')
      .addTag('Limits')
      .addTag('POS')
      .addTag('Reports')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
      ignoreGlobalPrefix: false,
    });

    SwaggerModule.setup('api-docs', app, document, {
      jsonDocumentUrl: 'api-docs/openapi.json',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        displayRequestDuration: true,
      },
      customSiteTitle: 'KioEdu — API Docs',
    });

    if (process.env.EXPORT_OPENAPI === '1') {
      writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
    }
  }

  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
