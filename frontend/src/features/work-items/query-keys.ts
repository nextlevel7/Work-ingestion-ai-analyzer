export const workItemKeys = {
  all: ['work-items'] as const,
  list: ['work-items', 'list'] as const,
  create: ['work-items', 'mutations', 'create'] as const,
  action: ['work-items', 'mutations', 'action'] as const,
}
