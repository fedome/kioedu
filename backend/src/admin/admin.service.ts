import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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

  async resetUserPassword(id: number, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 12);
    return this.prisma.user.update({
      where: { id },
      data: { password: hash }
    });
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

  async createKiosk(data: { name: string; schoolId: number; ownerId: number; apiKey: string }) {
    return this.prisma.kiosk.create({
      data: {
        name: data.name,
        schoolId: data.schoolId,
        ownerId: data.ownerId,
        apiKey: data.apiKey,
        subscriptionActive: true
      }
    });
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
