import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';
import { WorkItemStatus } from '../types/work-item-status';

export class UpdateWorkItemStatusDto {
  @ApiProperty({
    enum: [WorkItemStatus.COMPLETED],
    example: WorkItemStatus.COMPLETED,
  })
  @Equals(WorkItemStatus.COMPLETED)
  status!: WorkItemStatus;
}
