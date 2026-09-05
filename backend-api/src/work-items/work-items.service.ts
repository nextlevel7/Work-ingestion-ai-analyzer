import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkItem } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { WorkItemStatus } from './types/work-item-status';

@Injectable()
export class WorkItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateWorkItemDto,
  ): Promise<{ created: boolean; workItem: WorkItem }> {
    try {
      const workItem = await this.prisma.workItem.create({
        data: dto,
      });

      return { created: true, workItem };
    } catch (error: unknown) {
      if (!this.isUniqueConflict(error)) {
        throw error;
      }

      const workItem = await this.prisma.workItem.findUnique({
        where: { externalId: dto.externalId },
      });

      if (!workItem) {
        throw error;
      }

      if (!this.hasSameContent(workItem, dto)) {
        throw new ConflictException(
          'Work item already exists with different title or description',
        );
      }

      return { created: false, workItem };
    }
  }

  findAll(): Promise<WorkItem[]> {
    return this.prisma.workItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<WorkItem> {
    const workItem = await this.prisma.workItem.findUnique({
      where: { id },
    });

    if (!workItem) {
      throw new NotFoundException('Work item not found');
    }

    return workItem;
  }

  async updateStatus(id: string, status: WorkItemStatus): Promise<WorkItem> {
    const workItem = await this.findOne(id);

    if (!this.canUpdateStatus(workItem.status, status)) {
      throw new ConflictException(
        `Cannot move work item from ${workItem.status} to ${status}`,
      );
    }

    return this.prisma.workItem.update({
      where: { id },
      data: { status },
    });
  }

  private isUniqueConflict(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private hasSameContent(workItem: WorkItem, dto: CreateWorkItemDto): boolean {
    return (
      workItem.title === dto.title &&
      workItem.description === dto.description
    );
  }

  private canUpdateStatus(from: string, to: WorkItemStatus): boolean {
    if (from === WorkItemStatus.RECEIVED) {
      return to === WorkItemStatus.ANALYSING;
    }

    if (from === WorkItemStatus.ANALYSING) {
      return (
        to === WorkItemStatus.READY_FOR_REVIEW ||
        to === WorkItemStatus.FAILED
      );
    }

    if (from === WorkItemStatus.READY_FOR_REVIEW) {
      return to === WorkItemStatus.COMPLETED;
    }

    if (from === WorkItemStatus.FAILED) {
      return to === WorkItemStatus.ANALYSING;
    }

    return false;
  }
}
