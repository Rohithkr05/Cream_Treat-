import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Protected Admin API to fetch paginated incoming orders.
   * Supports sorting (newest first), pagination (page, limit <= 50),
   * status filtering, and date filtering.
   */
  @Get()
  async getOrders(@Query() query: AdminOrderQueryDto) {
    return this.ordersService.findAdminOrders(query);
  }

  /**
   * Protected Admin API to fetch full single order details by MongoDB ObjectId.
   */
  @Get(':id')
  async getOrderById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.ordersService.findAdminOrderById(id);
  }

  /**
   * Protected Admin API to transition an order through its lifecycle.
   * Enforces valid lifecycle transitions and rejects invalid moves with 409 Conflict.
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, updateStatusDto.status);
  }
}

