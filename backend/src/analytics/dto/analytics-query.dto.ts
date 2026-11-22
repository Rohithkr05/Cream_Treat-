import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

export type SalesInterval = 'day' | 'week' | 'month';

export class AnalyticsDateRangeDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  endDate?: string;
}

export class AnalyticsSalesQueryDto extends AnalyticsDateRangeDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'], {
    message: 'interval must be one of: day, week, month',
  })
  interval?: SalesInterval;

  @IsOptional()
  @IsIn(['day', 'week', 'month'], {
    message: 'period must be one of: day, week, month',
  })
  period?: SalesInterval;
}

export class AnalyticsPaginationQueryDto extends AnalyticsDateRangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 10;
}

