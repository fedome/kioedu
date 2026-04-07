import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  /** Admin: Ver todos los tickets (o filtrados por estado) */
  async getAllTickets(status?: string) {
    // @ts-ignore
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /** Obtener el hilo completo de mensajes de un ticket */
  async getTicketDetails(id: number) {
    // @ts-ignore
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }

  /** Usuario/Admin: Responder a un ticket */
  async replyToTicket(ticketId: number, senderRole: string, content: string) {
    // @ts-ignore
    const message = await this.prisma.ticketMessage.create({
      data: { ticketId, senderRole, content }
    });
    
    // Al responder, actualizar el updatedAt del Ticket para subirlo en la lista
    // @ts-ignore
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    });

    return message;
  }

  /** Admin: Cerrar ticket */
  async closeTicket(id: number) {
    // @ts-ignore
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'CLOSED' }
    });
  }
}
