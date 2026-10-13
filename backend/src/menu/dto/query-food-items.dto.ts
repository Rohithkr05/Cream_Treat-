import { IsMongoId, IsOptional } from 'class-validator';

export class QueryFoodItemsDto {
  @IsMongoId({ message: 'categoryId must be a valid 24-character hexadecimal MongoDB ObjectId' })
  @IsOptional()
  categoryId?: string;
}
