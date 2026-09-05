import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkItemStatus } from '../types/work-item-status';

export class UpdateWorkItemStatusDto {
  @ApiProperty({
    enum: WorkItemStatus,
    example: WorkItemStatus.ANALYSING,
  })
  @IsEnum(WorkItemStatus)
  status!: WorkItemStatus;
}
