import type { WorkItemStatus } from './work-item-status';

export interface WorkItem {
  id: string;
  externalId: string;
  title: string;
  description: string;
  status: WorkItemStatus;
  category: string | null;
  priority: string | null;
  summary: string | null;
  recommendedAction: string | null;
  analysisError: string | null;
  analysisAttemptCount: number;
  createdAt: Date;
  updatedAt: Date;
}
