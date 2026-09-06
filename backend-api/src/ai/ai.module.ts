import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_PROVIDER_TOKEN, AiProvider } from './ai.provider';
import { AiService } from './ai.service';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenAiProvider } from './providers/openai.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    AiService,
    MockAiProvider,
    OpenAiProvider,
    {
      provide: AI_PROVIDER_TOKEN,
      inject: [ConfigService, MockAiProvider, OpenAiProvider],
      useFactory: (
        config: ConfigService,
        mockProvider: MockAiProvider,
        openAiProvider: OpenAiProvider,
      ): AiProvider => {
        const providerName = config
          .get<string>('AI_PROVIDER', 'mock')
          .trim()
          .toLowerCase();

        if (providerName === 'openai') {
          return openAiProvider;
        }

        if (providerName === 'mock') {
          return mockProvider;
        }

        throw new Error(`Unsupported AI_PROVIDER: ${providerName}`);
      },
    },
  ],
  exports: [AiService],
})
export class AiModule {}
