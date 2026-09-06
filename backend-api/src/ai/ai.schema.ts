import { z } from 'zod';

export const AiCategorySchema = z.enum([
  'DOCUMENT_REQUEST',
  'GENERAL_QUERY',
  'APPLICATION_REVIEW',
  'INFORMATION_UPDATE',
  'COMPLIANCE_REVIEW',
  'ESCALATION',
  'OTHER',
]);

export const AiPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const AiAnalysisResultSchema = z
  .object({
    category: AiCategorySchema,
    priority: AiPrioritySchema,
    summary: z.string().trim().min(1, 'Summary cannot be empty').max(500),
    recommendedAction: z
      .string()
      .trim()
      .min(1, 'Recommended action cannot be empty')
      .max(1000),
  })
  .strict();

export type AiCategory = z.infer<typeof AiCategorySchema>;

export type AiPriority = z.infer<typeof AiPrioritySchema>;

export type AiAnalysisResult = z.infer<typeof AiAnalysisResultSchema>;
