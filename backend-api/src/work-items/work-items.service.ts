import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkItem } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';

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
}
