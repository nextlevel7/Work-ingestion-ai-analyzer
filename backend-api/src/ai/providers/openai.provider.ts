import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { ZodError } from 'zod';
import { AiProvider } from '../ai.provider';
import { AiAnalysisResultSchema } from '../ai.schema';
import { AiAnalysisInput } from '../ai.types';
import { AiProviderError, AiInvalidResponseError } from '../errors/ai.errors';
import { AI_ANALYSIS_INSTRUCTIONS } from '../prompt/ai.prompt';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private client?: OpenAI;

  constructor(private readonly config: ConfigService) {}

  async analyse(input: AiAnalysisInput): Promise<unknown> {
    try {
      const response = await this.getClient().responses.parse({
        model: this.getModel(),
        instructions: AI_ANALYSIS_INSTRUCTIONS,
        input: this.buildInput(input),
        store: false,
        text: {
          format: zodTextFormat(
            AiAnalysisResultSchema,
            'work_item_analysis',
          ),
        },
      });

      if (!response.output_parsed) {
        throw new AiInvalidResponseError({
          cause: new Error('OpenAI returned an empty analysis'),
        });
      }

      return response.output_parsed;
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      if (error instanceof SyntaxError || error instanceof ZodError) {
        throw new AiInvalidResponseError({ cause: error });
      }

      throw new AiProviderError(this.getErrorMessage(error), { cause: error });
    }
  }

  private getClient(): OpenAI {
    if (this.client) {
      return this.client;
    }

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      throw new AiProviderError(
        'AI service configuration error. Contact the administrator.',
        { cause: new Error('OPENAI_API_KEY is required when AI_PROVIDER is openai') },
      );
    }

    this.client = new OpenAI({
      apiKey,
      timeout: this.getTimeout(),
    });

    return this.client;
  }

  private getModel(): string {
    return this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-5-mini';
  }

  private getTimeout(): number {
    const timeout = Number(this.config.get('OPENAI_TIMEOUT_MS') ?? 15000);
    return Number.isFinite(timeout) && timeout > 0 ? timeout : 15000;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return 'AI analysis timed out. Please retry.';
    }

    if (
      error instanceof OpenAI.AuthenticationError ||
      error instanceof OpenAI.PermissionDeniedError ||
      error instanceof OpenAI.BadRequestError ||
      error instanceof OpenAI.NotFoundError ||
      (error instanceof OpenAI.APIError && error.code === 'insufficient_quota')
    ) {
      return 'AI service configuration error. Contact the administrator.';
    }

    if (
      error instanceof OpenAI.APIConnectionError ||
      error instanceof OpenAI.RateLimitError ||
      error instanceof OpenAI.InternalServerError
    ) {
      return 'AI service is temporarily unavailable. Please retry.';
    }

    return 'AI analysis failed. Please retry.';
  }

  private buildInput(input: AiAnalysisInput): string {
    return [
      'Analyse this work item.',
      '',
      `Title: ${input.title}`,
      `Description: ${input.description}`,
    ].join('\n');
  }
}
