import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || !isValidObjectId(value)) {
      throw new BadRequestException(
        `Invalid ID format: "${value}". Must be a valid 24-character hex ObjectId.`,
      );
    }
    return value;
  }
}
