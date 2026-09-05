import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication): void {
  const port = process.env.PORT ?? 3000;

  const config = new DocumentBuilder()
    .setTitle('Odin Work Intake API')
    .setDescription('API for receiving and reviewing incoming work items.')
    .setVersion('0.1.0')
    .addServer(`http://localhost:${port}`, 'Local development')
    .addTag('Health')
    .addTag('Work Items')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json',
  });
}
