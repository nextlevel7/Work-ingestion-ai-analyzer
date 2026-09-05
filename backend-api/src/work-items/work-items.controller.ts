import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { WorkItem } from '../generated/prisma/client';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemStatusDto } from './dto/update-work-item-status.dto';
import { WorkItemResponseDto } from './dto/work-item-response.dto';
import { WorkItemsService } from './work-items.service';

@ApiTags('Work Items')
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Post()
  @ApiCreatedResponse({ type: WorkItemResponseDto })
  @ApiOkResponse({ type: WorkItemResponseDto })
  async create(
    @Body() dto: CreateWorkItemDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WorkItem> {
    const result = await this.workItemsService.create(dto);

    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.workItem;
  }

  @Get()
  @ApiOkResponse({
    type: WorkItemResponseDto,
    isArray: true,
  })
  findAll(): Promise<WorkItem[]> {
    return this.workItemsService.findAll();
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
}
