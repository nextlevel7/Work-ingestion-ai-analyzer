import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkItemStatus } from '../types/work-item-status';

export class WorkItemResponseDto {
  @ApiProperty({
    example: '9dd05a52-e447-4db7-a9c3-0b66f9ca57e9',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'CRM-12345' })
  externalId!: string;

  @ApiProperty({ example: 'Missing income document' })
  title!: string;

  @ApiProperty({
    example:
      'The applicant submitted their application but has not provided their latest payslip.',
  })
  description!: string;

  @ApiProperty({
    enum: WorkItemStatus,
    example: WorkItemStatus.RECEIVED,
  })
  status!: WorkItemStatus;

  @ApiPropertyOptional({
    nullable: true,
    example: 'DOCUMENT_REQUEST',
  })
  category!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'HIGH',
  })
  priority!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'The applicant needs to provide their latest payslip.',
  })
  summary!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Request the missing payslip from the applicant.',
  })
  recommendedAction!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: null,
  })
  analysisError!: string | null;

  @ApiProperty({ example: 0, minimum: 0 })
  analysisAttemptCount!: number;

  @ApiProperty({
    example: '2026-09-05T06:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-09-05T06:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: Date;
}
