import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async getAll(@Query('status') status?: string) {
    return this.ticketsService.getAllTickets(status);
  }

  @Get(':id')
  async getDetails(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.getTicketDetails(id);
  }

  @Post(':id/reply')
  async addReply(
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
    @Body('senderRole') senderRole: string = 'ADMIN'
  ) {
    return this.ticketsService.replyToTicket(id, senderRole, content);
  }

  @Patch(':id/close')
  async closeTicket(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.closeTicket(id);
  }
}
