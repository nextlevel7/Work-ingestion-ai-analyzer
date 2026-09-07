import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Param,
  Patch,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemStatusDto } from './dto/update-work-item-status.dto';
import {
  WorkItemPageResponseDto,
  WorkItemResponseDto,
} from './dto/work-item-response.dto';
import type { WorkItem } from './types/work-item';
import { WorkItemStatus } from './types/work-item-status';
import { WorkItemsService } from './work-items.service';

@ApiTags('Work Items')
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Post()
  @ApiOperation({
    description:
      'The first successful insert for an externalId wins. Repeated IDs return the current item without changing its content, status, or analysis.',
  })
  @ApiCreatedResponse({
    type: WorkItemResponseDto,
    description: 'New work item created in RECEIVED.',
  })
  @ApiOkResponse({
    type: WorkItemResponseDto,
    description: 'Existing submission returned in its current state.',
  })
  @ApiBadRequestResponse({ description: 'Invalid ingestion fields.' })
  async create(
    @Body() dto: CreateWorkItemDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WorkItem> {
    const result = await this.workItemsService.create(dto);

    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.workItem;
  }

  @Get()
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number, starting at 1.',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page. Maximum 50.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WorkItemStatus,
    description: 'Only return work items with this status.',
  })
  @ApiOkResponse({ type: WorkItemPageResponseDto })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('status', new ParseEnumPipe(WorkItemStatus, { optional: true }))
    status?: WorkItemStatus,
  ) {
    return this.workItemsService.findAll(page, pageSize, status);
  }

  @Get(':id')
  @ApiOkResponse({ type: WorkItemResponseDto })
  findOne(@Param('id') id: string): Promise<WorkItem> {
    return this.workItemsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: WorkItemResponseDto })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateWorkItemStatusDto,
  ): Promise<WorkItem> {
    return this.workItemsService.updateStatus(id, dto.status);
  }

  @Post(':id/analyse')
  @ApiOkResponse({ type: WorkItemResponseDto })
  analyse(@Param('id') id: string): Promise<WorkItem> {
    return this.workItemsService.analyse(id);
  }

  @Post(':id/retry')
  @ApiOkResponse({ type: WorkItemResponseDto })
  retry(@Param('id') id: string): Promise<WorkItem> {
    return this.workItemsService.retry(id);
  }
}
