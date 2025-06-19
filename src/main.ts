import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import {} from '@nestjs/platform-express'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['debug'],
  });
  const config = new DocumentBuilder()
  .setTitle('넷플릭스 테스트')
  .setDescription('Nestjs로 만든 넷플릭스 테스트')
  .setVersion('1.0')
  .addBasicAuth()
  .addBearerAuth()
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document, {
    swaggerOptions: {
      persistAuthorization: true
    }
  });
  // app.enableVersioning({
  //   type: VersioningType.MEDIA_TYPE,
  //   key: 'v='
  //   //header: 'version',
  //   //defaultVersion: ['1', '2'],
  // });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true
    },
  }));
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
