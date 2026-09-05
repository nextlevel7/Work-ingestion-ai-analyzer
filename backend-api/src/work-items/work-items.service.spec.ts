import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, WorkItem, WorkItemStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { WorkItemsService } from './work-items.service';

describe('WorkItemsService', () => {
  const dto: CreateWorkItemDto = {
    externalId: 'CRM-12345',
    title: 'Missing income document',
    description: 'The applicant has not provided their latest payslip.',
  };

  const workItem: WorkItem = {
    id: 'work-item-id',
    externalId: dto.externalId,
    title: dto.title,
    description: dto.description,
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

  it('creates a work item', async () => {
    const prisma = {
      workItem: {
        create: jest.fn().mockResolvedValue(workItem),
      },
    } as unknown as PrismaService;
    const service = new WorkItemsService(prisma);

    await expect(service.create(dto)).resolves.toEqual({
      created: true,
      workItem,
    });
    expect(prisma.workItem.create).toHaveBeenCalledWith({ data: dto });
  });

  it('returns the existing row when externalId already exists', async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: {
          driverAdapterError: {
            cause: {
              constraint: { index: 'work_items_externalId_key' },
            },
          },
        },
      },
    );
    const prisma = {
      workItem: {
        create: jest.fn().mockRejectedValue(uniqueError),
        findUnique: jest.fn().mockResolvedValue(workItem),
      },
    } as unknown as PrismaService;
    const service = new WorkItemsService(prisma);

    await expect(service.create(dto)).resolves.toEqual({
      created: false,
      workItem,
    });
    expect(prisma.workItem.findUnique).toHaveBeenCalledWith({
      where: { externalId: dto.externalId },
    });
  });

  it('throws 409 when externalId matches a different payload', async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: {
          driverAdapterError: {
            cause: {
              constraint: { index: 'work_items_externalId_key' },
            },
          },
        },
      },
    );
    const prisma = {
      workItem: {
        create: jest.fn().mockRejectedValue(uniqueError),
        findUnique: jest.fn().mockResolvedValue({
          ...workItem,
          title: 'Original title',
        }),
      },
    } as unknown as PrismaService;
    const service = new WorkItemsService(prisma);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists newest work items first', async () => {
    const prisma = {
      workItem: {
        findMany: jest.fn().mockResolvedValue([workItem]),
      },
    } as unknown as PrismaService;
    const service = new WorkItemsService(prisma);

    await expect(service.findAll()).resolves.toEqual([workItem]);
    expect(prisma.workItem.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });

  it('throws 404 when a work item is missing', async () => {
    const prisma = {
      workItem: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const service = new WorkItemsService(prisma);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
