import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  /** Buscar colegio por código de invitación (público) */
  async findByInviteCode(code: string) {
    const school = await this.prisma.school.findUnique({
      where: { inviteCode: code.toUpperCase() },
      select: { id: true, name: true, address: true },
    });

    if (!school) {
      throw new NotFoundException('Código de colegio no encontrado');
    }

    return school;
  }

  /** Listar todos los colegios (admin) */
  async findAll() {
    return this.prisma.school.findMany({
      include: {
        _count: {
          select: { children: true, kiosks: true, owners: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Crear colegio (admin) */
  async create(data: { name: string; address?: string; inviteCode?: string }) {
    const inviteCode = data.inviteCode || this.generateInviteCode();
    return this.prisma.school.create({
      data: {
        name: data.name,
        address: data.address,
        inviteCode: inviteCode.toUpperCase(),
      },
    });
  }

  /** Actualizar colegio (admin) */
  async update(id: number, data: { name?: string; address?: string; inviteCode?: string }) {
    return this.prisma.school.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.inviteCode && { inviteCode: data.inviteCode.toUpperCase() }),
      },
    });
  }

  /** Elimiar colegio (admin) */
  async delete(id: number) {
    return this.prisma.school.delete({ where: { id } });
  }

  /** Generar código de invitación aleatorio */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0,O,1,I para evitar confusión
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
