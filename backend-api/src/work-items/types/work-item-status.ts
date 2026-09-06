export const WorkItemStatus = {
  RECEIVED: 'RECEIVED',
  ANALYSING: 'ANALYSING',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type WorkItemStatus =
  (typeof WorkItemStatus)[keyof typeof WorkItemStatus];
