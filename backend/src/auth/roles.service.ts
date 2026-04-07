import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) { }

    async findAllRoles(schoolId?: number, onlyPos: boolean = false) {
        const where: Prisma.RoleWhereInput = {};
        if (schoolId) where.schoolId = schoolId;
        if (onlyPos) where.isPosRole = true;

        return this.prisma.role.findMany({
            where,
            include: {
                permissions: {
                    include: { permission: true }
                }
            }
        });
    }

    async findRoleById(id: number) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                permissions: {
                    include: { permission: true }
                }
            }
        });
        if (!role) throw new NotFoundException('Role not found');
        return role;
    }

    async createRole(name: string, schoolId?: number, description?: string, permissionIds: number[] = []) {
        try {
            return await this.prisma.role.create({
                data: {
                    name,
                    description,
                    schoolId,
                    permissions: {
                        create: permissionIds.map(id => ({ permissionId: id }))
                    }
                },
                include: {
                    permissions: {
                        include: { permission: true }
                    }
                }
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException('Role name already exists');
            }
            throw e;
        }
    }

    async updateRole(id: number, name?: string, description?: string, permissionIds?: number[]) {
        const data: any = {};
        if (name) data.name = name;
        if (description !== undefined) data.description = description;

        if (permissionIds) {
            await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
            data.permissions = {
                create: permissionIds.map(pId => ({ permissionId: pId }))
            };
        }

        try {
            return await this.prisma.role.update({
                where: { id },
                data,
                include: {
                    permissions: {
                        include: { permission: true }
                    }
                }
            });
        } catch (e) {
            throw new NotFoundException('Role not found or update failed');
        }
    }

    async deleteRole(id: number) {
        try {
            return await this.prisma.role.delete({ where: { id } });
        } catch (e) {
            throw new NotFoundException('Role not found');
        }
    }

    async findAllPermissions() {
        return this.prisma.permission.findMany();
    }

    async createPermission(action: string, subject: string, description?: string) {
        try {
            return await this.prisma.permission.create({
                data: { action, subject, description }
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException('Permission already exists');
            }
            throw e;
        }
    }
}
