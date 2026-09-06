import { AiAnalysisInput } from './ai.types';

export const AI_PROVIDER_TOKEN = Symbol('AI_PROVIDER_TOKEN');

export interface AiProvider {
  analyse(input: AiAnalysisInput): Promise<unknown>;
}
