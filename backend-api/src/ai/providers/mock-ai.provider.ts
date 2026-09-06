import { Injectable } from '@nestjs/common';
import { AiProvider } from '../ai.provider';
import { AiAnalysisResult } from '../ai.schema';
import { AiAnalysisInput } from '../ai.types';

@Injectable()
export class MockAiProvider implements AiProvider {
  async analyse(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    return {
      category: 'GENERAL_QUERY',
      priority: 'MEDIUM',
      summary: input.description.trim().slice(0, 180),
      recommendedAction: 'Review the work item and decide the next action.',
    };
  }
}
