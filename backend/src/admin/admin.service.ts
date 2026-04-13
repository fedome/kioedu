import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  // -- Stats (Dashboard) --
  async getStats() {
    const totalSchools = await this.prisma.school.count();
    const totalUsers = await this.prisma.user.count();
    const totalChildren = await this.prisma.child.count();
    
    const totalKiosks = await this.prisma.kiosk.count();
    const activeKiosks = await this.prisma.kiosk.count({ where: { subscriptionActive: true } });
    const suspendedKiosks = totalKiosks - activeKiosks;

    return {
      schools: totalSchools,
      users: totalUsers,
      children: totalChildren,
      kiosks: { total: totalKiosks, active: activeKiosks, suspended: suspendedKiosks }
    };
  }

  // -- Users / Parents --
  async getUsers() {
    return this.prisma.user.findMany({
      include: {
        children: {
          include: { school: { select: { name: true } } }
        },
        roles: {
          include: { role: { select: { name: true } } }
        }
      },
      orderBy: { id: 'desc' }
    });
  }

  async updateUser(id: number, data: { name?: string; email?: string }) {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  /**
   * Genera un token de reset de contraseña para un usuario.
   * El admin NO elige la nueva contraseña; el usuario la cambia él mismo.
   */
  async forcePasswordReset(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const resetToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, purpose: 'password-reset' },
      { secret: process.env.JWT_SECRET, expiresIn: '24h' },
    );

    // TODO: Integrar con servicio de email para enviar el link automáticamente
    return {
      message: 'Token de restablecimiento generado. Envialo al usuario.',
      resetToken,
      resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`,
      expiresIn: '24 horas',
    };
  }

  async deleteUser(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
  }

  // -- Owners --
  async getOwners() {
    return this.prisma.owner.findMany({
      include: { school: { select: { name: true } }, _count: { select: { kiosks: true } } },
      orderBy: { id: 'desc' }
    });
  }

  async createOwner(data: { name: string; schoolId: number; mpAccessToken?: string; mpPublicKey?: string }) {
    return this.prisma.owner.create({
      data: {
        name: data.name,
        schoolId: data.schoolId,
        mpAccessToken: data.mpAccessToken,
        mpPublicKey: data.mpPublicKey
      }
    });
  }

  async updateOwner(id: number, data: { name?: string; schoolId?: number; mpAccessToken?: string; mpPublicKey?: string }) {
    return this.prisma.owner.update({
      where: { id },
      data
    });
  }

  async deleteOwner(id: number) {
    return this.prisma.owner.delete({ where: { id } });
  }

  // -- Kiosks --
  async getKiosks() {
    return this.prisma.kiosk.findMany({
      include: { 
        school: { select: { name: true } },
        owner: { select: { name: true } }
      },
      orderBy: { id: 'desc' }
    });
  }

  async createKiosk(data: { name: string; schoolId: number; ownerId: number }) {
    const apiKey = `kiosk_${randomUUID().replace(/-/g, '')}`;
    return this.prisma.kiosk.create({
      data: {
        name: data.name,
        schoolId: data.schoolId,
        ownerId: data.ownerId,
        apiKey,
        subscriptionActive: true
      }
    });
  }

  /**
   * Rota la API Key de un kiosco. La anterior deja de funcionar inmediatamente.
   */
  async rotateKioskApiKey(id: number) {
    const kiosk = await this.prisma.kiosk.findUnique({ where: { id } });
    if (!kiosk) throw new NotFoundException('Kiosco no encontrado');

    const newApiKey = `kiosk_${randomUUID().replace(/-/g, '')}`;
    await this.prisma.kiosk.update({
      where: { id },
      data: { apiKey: newApiKey },
    });

    // Revocar todas las sesiones activas del kiosco (seguridad)
    await this.prisma.kioskSession.updateMany({
      where: { kioskId: id, revokedAt: null },
      data: { revokedAt: new Date(), reason: 'api-key-rotated' },
    });

    return {
      message: 'API Key rotada exitosamente. Actualizá la configuración del POS.',
      apiKey: newApiKey,
    };
  }

  async toggleKioskSubscription(id: number, active: boolean) {
    return this.prisma.kiosk.update({
      where: { id },
      data: { subscriptionActive: active }
    });
  }

  async updateKiosk(id: number, data: { name?: string; schoolId?: number; ownerId?: number }) {
    return this.prisma.kiosk.update({
      where: { id },
      data
    });
  }

  async deleteKiosk(id: number) {
    return this.prisma.kiosk.delete({ where: { id } });
  }
}
