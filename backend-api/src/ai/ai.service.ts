import { Inject, Injectable } from '@nestjs/common';
import { AiProviderError, AiInvalidResponseError } from './errors/ai.errors';
import { AI_PROVIDER_TOKEN, AiProvider } from './ai.provider';
import { AiAnalysisResult, AiAnalysisResultSchema } from './ai.schema';
import { AiAnalysisInput } from './ai.types';

@Injectable()
export class AiService {
  constructor(@Inject(AI_PROVIDER_TOKEN) private readonly provider: AiProvider) {}

  async analyse(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    let result: unknown;

    try {
      result = await this.provider.analyse(input);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      throw new AiProviderError('AI analysis failed. Please retry.', {
        cause: error,
      });
    }

    try {
      return AiAnalysisResultSchema.parse(result);
    } catch (error) {
      throw new AiInvalidResponseError({ cause: error });
    }
  }
}
