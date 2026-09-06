import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkItem } from '../generated/prisma/client';
import { AiService } from '../ai/ai.service';
import { AiProviderError } from '../ai/errors/ai.errors';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { WorkItemStatus } from './types/work-item-status';

@Injectable()
export class WorkItemsService {
  private readonly logger = new Logger(WorkItemsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

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

  async analyse(id: string): Promise<WorkItem> {
    const workItem = await this.findOne(id);

    if (workItem.status !== WorkItemStatus.RECEIVED) {
      throw new ConflictException(
        `Only RECEIVED items can be analysed. Current status is ${workItem.status}`,
      );
    }

    return this.runAnalysis(workItem, WorkItemStatus.RECEIVED);
  }

  async retry(id: string): Promise<WorkItem> {
    const workItem = await this.findOne(id);

    if (workItem.status !== WorkItemStatus.FAILED) {
      throw new ConflictException(
        `Only FAILED items can be retried. Current status is ${workItem.status}`,
      );
    }

    return this.runAnalysis(workItem, WorkItemStatus.FAILED);
  }

  private async runAnalysis(
    workItem: WorkItem,
    expectedStatus: WorkItemStatus,
  ): Promise<WorkItem> {
    const started = await this.startAnalysisIfStatusMatches(
      workItem.id,
      expectedStatus,
    );

    if (!started) {
      const currentWorkItem = await this.findOne(workItem.id);

      throw new ConflictException(
        `Cannot start analysis from status ${currentWorkItem.status}`,
      );
    }

    try {
      const result = await this.aiService.analyse({
        title: workItem.title,
        description: workItem.description,
      });

      return this.prisma.workItem.update({
        where: { id: workItem.id },
        data: {
          status: WorkItemStatus.READY_FOR_REVIEW,
          category: result.category,
          priority: result.priority,
          summary: result.summary,
          recommendedAction: result.recommendedAction,
          analysisError: null,
          analysisAttemptCount: { increment: 1 },
        },
      });
    } catch (error) {
      const analysisError = this.getErrorMessage(error);

      this.logger.error(
        `AI analysis failed for work item ${workItem.id}: ${analysisError}`,
        this.getErrorStack(error),
      );

      return this.prisma.workItem.update({
        where: { id: workItem.id },
        data: {
          status: WorkItemStatus.FAILED,
          analysisError,
          analysisAttemptCount: { increment: 1 },
        },
      });
    }
  }

  private async startAnalysisIfStatusMatches(
    id: string,
    expectedStatus: WorkItemStatus,
  ): Promise<boolean> {
    const result = await this.prisma.workItem.updateMany({
      where: {
        id,
        status: expectedStatus,
      },
      data: {
        status: WorkItemStatus.ANALYSING,
        analysisError: null,
      },
    });

    return result.count === 1;
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

  private getErrorMessage(error: unknown): string {
    return error instanceof AiProviderError
      ? error.message
      : 'AI analysis failed. Please retry.';
  }

  private getErrorStack(error: unknown): string | undefined {
    if (error instanceof AiProviderError && error.cause instanceof Error) {
      return error.cause.stack;
    }

    return error instanceof Error ? error.stack : undefined;
  }

  private canUpdateStatus(from: string, to: WorkItemStatus): boolean {
    return (
      from === WorkItemStatus.READY_FOR_REVIEW &&
      to === WorkItemStatus.COMPLETED
    );
  }
}
