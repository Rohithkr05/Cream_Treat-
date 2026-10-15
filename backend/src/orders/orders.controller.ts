import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Public endpoint for customer order placement.
   * Customer login not required.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  /**
   * Public endpoint to fetch order details by ID for order tracking / status.
   * Customer login not required. Returns sanitized customer-safe payload.
   */
  @Get(':id')
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.ordersService.findCustomerOrderById(id);
  }
}
