import { ConflictException, Logger } from '@nestjs/common';
import { Prisma, WorkItem } from '../generated/prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { WorkItemStatus } from './types/work-item-status';
import { WorkItemsService } from './work-items.service';

describe('WorkItemsService', () => {
  const dto: CreateWorkItemDto = {
    externalId: 'CRM-12345',
    title: 'Missing income document',
    description: 'The applicant has not provided their latest payslip.',
  };

  const workItem: WorkItem = {
    id: 'work-item-id',
    ...dto,
    status: WorkItemStatus.RECEIVED,
    category: null,
    priority: null,
    summary: null,
    recommendedAction: null,
    analysisError: null,
    analysisAttemptCount: 0,
    createdAt: new Date('2026-09-05T00:00:00.000Z'),
    updatedAt: new Date('2026-09-05T00:00:00.000Z'),
  };

  const analysis = {
    category: 'DOCUMENT_REQUEST',
    priority: 'MEDIUM',
    summary: 'The applicant has not provided their latest payslip.',
    recommendedAction: 'Request the missing payslip.',
  };

  const prisma = {
    workItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const provider = { analyse: jest.fn() };
  let service: WorkItemsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.workItem.findUnique.mockResolvedValue(workItem);
    prisma.workItem.updateMany.mockResolvedValue({ count: 1 });
    provider.analyse.mockResolvedValue(analysis);
    service = new WorkItemsService(
      prisma as unknown as PrismaService,
      new AiService(provider),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the existing item when the same externalId is received again', async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.10.0' },
    );
    prisma.workItem.create
      .mockResolvedValueOnce(workItem)
      .mockRejectedValueOnce(uniqueError);

    await expect(service.create(dto)).resolves.toEqual({
      created: true,
      workItem,
    });
    await expect(service.create(dto)).resolves.toEqual({
      created: false,
      workItem,
    });
    expect(prisma.workItem.findUnique).toHaveBeenCalledWith({
      where: { externalId: dto.externalId },
    });
    expect(prisma.workItem.create).toHaveBeenCalledTimes(2);
    expect(prisma.workItem.update).not.toHaveBeenCalled();
  });

  it('calls AI only once when two analysis requests race for the same item', async () => {
    const analysedItem = {
      ...workItem,
      ...analysis,
      status: WorkItemStatus.READY_FOR_REVIEW,
      analysisAttemptCount: 1,
    };

    // Both requests read RECEIVED, but only one conditional update succeeds.
    prisma.workItem.findUnique
      .mockResolvedValueOnce(workItem)
      .mockResolvedValueOnce(workItem)
      .mockResolvedValue({ ...workItem, status: WorkItemStatus.ANALYSING });
    prisma.workItem.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prisma.workItem.update.mockResolvedValue(analysedItem);

    const results = await Promise.allSettled([
      service.analyse(workItem.id),
      service.analyse(workItem.id),
    ]);

    expect(results).toEqual([
      { status: 'fulfilled', value: analysedItem },
      { status: 'rejected', reason: expect.any(ConflictException) },
    ]);
    expect(prisma.workItem.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.workItem.updateMany).toHaveBeenCalledWith({
      where: { id: workItem.id, status: WorkItemStatus.RECEIVED },
      data: { status: WorkItemStatus.ANALYSING, analysisError: null },
    });
    expect(provider.analyse).toHaveBeenCalledTimes(1);
    expect(prisma.workItem.update).toHaveBeenCalledTimes(1);
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: workItem.id },
      data: {
        ...analysis,
        status: WorkItemStatus.READY_FOR_REVIEW,
        analysisError: null,
        analysisAttemptCount: { increment: 1 },
      },
    });
  });

  it('rejects completing an item before it is ready for review', async () => {
    await expect(
      service.updateStatus(workItem.id, WorkItemStatus.COMPLETED),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.workItem.update).not.toHaveBeenCalled();
  });

  it('marks the item as failed without saving invalid AI output', async () => {
    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    provider.analyse.mockResolvedValue({ ...analysis, priority: 'URGENT' });
    const failedItem = {
      ...workItem,
      status: WorkItemStatus.FAILED,
      analysisError: 'AI returned an invalid analysis. Please retry.',
      analysisAttemptCount: 1,
    };
    prisma.workItem.update.mockResolvedValue(failedItem);

    await expect(service.analyse(workItem.id)).resolves.toEqual(failedItem);

    expect(provider.analyse).toHaveBeenCalledTimes(1);
    expect(prisma.workItem.update).toHaveBeenCalledTimes(1);
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: workItem.id },
      data: {
        status: WorkItemStatus.FAILED,
        analysisError: 'AI returned an invalid analysis. Please retry.',
        analysisAttemptCount: { increment: 1 },
      },
    });
    expect(logger).toHaveBeenCalledWith(
      expect.stringContaining(workItem.id),
      expect.stringContaining('ZodError'),
    );
  });
});
