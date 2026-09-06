import { ConflictException, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import type { WorkItem } from './types/work-item';
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

  it('returns the existing work item for a repeated externalId', async () => {
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
    expect(prisma.workItem.update).not.toHaveBeenCalled();
    expect(provider.analyse).not.toHaveBeenCalled();
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
    expect(provider.analyse).toHaveBeenCalledTimes(1);
    expect(prisma.workItem.update).toHaveBeenCalledTimes(1);
  });

  it('rejects completing an item before it is ready for review', async () => {
    await expect(
      service.updateStatus(workItem.id, WorkItemStatus.COMPLETED),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.workItem.update).not.toHaveBeenCalled();
  });

  it('rejects analysing a completed item', async () => {
    prisma.workItem.findUnique.mockResolvedValue({
      ...workItem,
      status: WorkItemStatus.COMPLETED,
    });

    await expect(service.analyse(workItem.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(provider.analyse).not.toHaveBeenCalled();
    expect(prisma.workItem.updateMany).not.toHaveBeenCalled();
  });

  it('allows retry only after failed AI processing', async () => {
    await expect(service.retry(workItem.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(provider.analyse).not.toHaveBeenCalled();

    prisma.workItem.findUnique.mockResolvedValue({
      ...workItem,
      status: WorkItemStatus.FAILED,
      analysisAttemptCount: 1,
      analysisError: 'Previous analysis failed.',
    });
    const retriedItem = {
      ...workItem,
      ...analysis,
      status: WorkItemStatus.READY_FOR_REVIEW,
      analysisAttemptCount: 2,
    };
    prisma.workItem.update.mockResolvedValue(retriedItem);

    await expect(service.retry(workItem.id)).resolves.toEqual(retriedItem);
    expect(prisma.workItem.updateMany).toHaveBeenCalledWith({
      where: { id: workItem.id, status: WorkItemStatus.FAILED },
      data: { status: WorkItemStatus.ANALYSING, analysisError: null },
    });
    expect(provider.analyse).toHaveBeenCalledTimes(1);
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

  it.each(['invalid output', 'provider failure'])(
    'marks %s as FAILED without saving an analysis',
    async (failure) => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      if (failure === 'invalid output') {
        provider.analyse.mockResolvedValue({ ...analysis, priority: 'URGENT' });
      } else {
        provider.analyse.mockRejectedValue(new Error('Provider unavailable'));
      }
      const analysisError = failure === 'invalid output'
        ? 'AI returned an invalid analysis. Please retry.'
        : 'AI analysis failed. Please retry.';
      const failedItem = {
        ...workItem,
        status: WorkItemStatus.FAILED,
        analysisError,
        analysisAttemptCount: 1,
      };
      prisma.workItem.update.mockResolvedValue(failedItem);

      await expect(service.analyse(workItem.id)).resolves.toEqual(failedItem);
      expect(prisma.workItem.update).toHaveBeenCalledTimes(1);
      expect(prisma.workItem.update).toHaveBeenCalledWith({
        where: { id: workItem.id },
        data: {
          status: WorkItemStatus.FAILED,
          analysisError,
          analysisAttemptCount: { increment: 1 },
        },
      });
    },
  );
});
