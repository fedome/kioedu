import {
    Injectable,
    ConflictException,
    NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { Role } from '../auth/roles.enum';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDto } from './dto/user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { AssignCardDto } from './dto/assign-card.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    /**
     * Mapea un User de Prisma a un UserDto seguro (sin password).
     */
    private mapToDto(user: any): UserDto {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles?.map((ur: any) => ur.role.name) || [],
            createdAt: user.createdAt,
        };
    }

    /**
     * Crea un nuevo usuario (usado por el Admin CRUD).
     */
    async create(dto: CreateUserDto): Promise<UserDto> {
        const hash = await bcrypt.hash(dto.password, 12);

        try {
            const roleNames = dto.roles && dto.roles.length > 0 ? dto.roles : [Role.CASHIER];

            const user = await this.prisma.user.create({
                data: {
                    name: dto.name,
                    email: dto.email.trim().toLowerCase(),
                    password: hash,
                    schoolId: dto.schoolId,
                    roles: {
                        create: await Promise.all(
                            roleNames.map(async (name) => {
                                let role = await this.prisma.role.findUnique({ where: { name } });
                                if (!role) {
                                    role = await this.prisma.role.create({ data: { name } });
                                }
                                return { roleId: role.id };
                            })
                        ),
                    },
                },
                include: {
                    roles: {
                        include: { role: true }
                    }
                }
            });
            return this.mapToDto(user);
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException('Email ya registrado');
            }
            throw e;
        }
    }

    /**
     * Busca un usuario por email (usado por AuthService).
     */
    async findByEmail(email: string): Promise<any | null> {
        return this.prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: { permission: true }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Busca un usuario por ID (usado por el Admin CRUD).
     */
    async findById(id: number, schoolId?: number): Promise<UserDto | null> {
        const user = await this.prisma.user.findFirst({
            where: { id, ...(schoolId ? { schoolId } : {}) },
            include: { roles: { include: { role: true } } }
        });
        if (!user) return null;
        return this.mapToDto(user);
    }

    /**
     * Lista todos los usuarios (o filtra por rol).
     */
    async findAll(schoolId?: number, roleName?: string): Promise<UserDto[]> {
        const where: Prisma.UserWhereInput = {};
        if (schoolId) where.schoolId = schoolId;
        if (roleName) {
            where.roles = {
                some: {
                    role: { name: roleName }
                }
            };
        }

        const users = await this.prisma.user.findMany({
            where,
            include: { roles: { include: { role: true } } },
            orderBy: { name: 'asc' },
        });
        return users.map(this.mapToDto);
    }

    /**
     * Elimina un usuario (hard delete removido, ver soft delete abajo).
     */

    /**
     * Actualiza un usuario (nombre, email, rol) por ID.
     */
    async update(id: number, dto: UpdateUserDto & { password?: string }, schoolId?: number): Promise<UserDto> {
        try {
            const existing = await this.prisma.user.findFirst({ where: { id, ...(schoolId ? { schoolId } : {}) } });
            if (!existing) throw new NotFoundException(`Usuario con ID ${id} no encontrado en tu escuela.`);
            const { roles, password, ...rest } = dto;
            const data: Prisma.UserUpdateInput = { ...rest };

            if (dto.email) {
                data.email = dto.email.trim().toLowerCase();
            }

            if (password) {
                data.password = await bcrypt.hash(password, 12);
            }

            if (roles) {
                // Borrar roles anteriores y crear nuevos
                await this.prisma.userRole.deleteMany({ where: { userId: id } });
                data.roles = {
                    create: await Promise.all(
                        roles.map(async (name) => {
                            let role = await this.prisma.role.findUnique({ where: { name } });
                            if (!role) {
                                role = await this.prisma.role.create({ data: { name } });
                            }
                            return { roleId: role.id };
                        })
                    ),
                };
            }

            const user = await this.prisma.user.update({
                where: { id },
                data,
                include: { roles: { include: { role: true } } }
            });
            return this.mapToDto(user);
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === 'P2025') {
                    throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
                }
                if (e.code === 'P2002') {
                    throw new ConflictException('Email ya registrado por otro usuario.');
                }
            }
            throw e;
        }
    }

    /**
     * Resetea la contraseña de un usuario por ID.
     */
    async resetPassword(id: number, dto: ResetPasswordDto, schoolId?: number): Promise<UserDto> {
        const existing = await this.prisma.user.findFirst({ where: { id, ...(schoolId ? { schoolId } : {}) } });
        if (!existing) throw new NotFoundException(`Usuario con ID ${id} no encontrado en tu escuela.`);
        // 1. Hashear la nueva contraseña
        const hash = await bcrypt.hash(dto.password, 12);

        // 2. Actualizar al usuario
        try {
            const user = await this.prisma.user.update({
                where: { id },
                data: {
                    password: hash,
                },
            });
            return this.mapToDto(user);
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
            }
            throw e;
        }
    }

    /**
     * Agrega un hijo a un padre (usado en AuthService al registrar hijos).
     * @param parentId ID del usuario padre
     * @param dto Datos del hijo a crear
     */
    async addChild(parentId: number, dto: CreateChildDto, userSchoolId?: number, userOwnerId?: number) {
        // Enforce Kiosk/Admin context if provided, else root school 1. 
        // This stops parents from blindly saving in root if the KioEdu goes global, though standard single-tenant it's OK.
        const defaultSchoolId = userSchoolId || 1;
        const ownerIdToBind = userOwnerId || 1;

        return this.prisma.child.create({
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                documentType: dto.documentType,
                documentNumber: dto.documentNumber,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                grade: dto.grade,
                division: dto.division,

                schoolId: defaultSchoolId,
                parentId: parentId,

                accounts: { create: { balanceCents: 0, ownerId: ownerIdToBind } },

            }
        });
    }

    /**
     * Vincular una tarjeta física (Mifare) a un alumno.
     */
    async assignCard(
        childId: number,
        dto: AssignCardDto,
        currentUserId: number,
        currentUserRoles: string[],
    ) {
        // 1) Buscar al alumno + su tarjeta actual
        const child = await this.prisma.child.findUnique({
            where: { id: childId },
            include: { card: true }, // asumo relación 1-1 Child.card
        });

        if (!child) {
            throw new NotFoundException('Alumno no encontrado');
        }

        // 2) Seguridad: si es PARENT, tiene que ser su hijo
        if (currentUserRoles.includes(Role.PARENT) && child.parentId !== currentUserId) {
            throw new ForbiddenException(
                'No tenés permiso para vincular una tarjeta a este alumno.',
            );
        }

        // 3) Normalizar el UID (opcional pero MUY recomendable)
        const uid = dto.uidHex.trim().toUpperCase();

        // 4) Ver si esa tarjeta ya existe
        const existingCard = await this.prisma.card.findUnique({
            where: { uidHex: uid },
        });

        // Si existe y está asociada a otro alumno → error
        if (existingCard && existingCard.childId !== childId) {
            throw new ConflictException(
                'Esta tarjeta ya está asociada a otro alumno.',
            );
        }

        // 5) Si el alumno ya tenía otra tarjeta distinta, la bloqueamos
        if (child.card && child.card.uidHex !== uid) {
            await this.prisma.card.update({
                where: { id: child.card.id },
                data: { isBlocked: true },
            });
        }

        // 6) Si la tarjeta ya existía pero estaba bloqueada o en este mismo hijo,
        //    la re-asignamos (o la "reactivamos") al hijo actual
        if (existingCard) {
            return this.prisma.card.update({
                where: { id: existingCard.id },
                data: {
                    childId,
                    isBlocked: false,
                },
            });
        }

        // 7) Si no existe, la creamos
        return this.prisma.card.create({
            data: {
                uidHex: uid,
                childId,
                isBlocked: false,
            },
        });
    }

    async updateChild(childId: number, dto: UpdateChildDto, userId: number, userRoles: string[]) {
        // 1. Buscar al hijo
        const child = await this.prisma.child.findUnique({ where: { id: childId } });
        if (!child) throw new NotFoundException('Alumno no encontrado');

        // 2. Validar permisos (Si es PARENT, debe ser SU hijo)
        if (userRoles.includes(Role.PARENT) && child.parentId !== userId) {
            throw new ForbiddenException('No tienes permiso para editar este alumno.');
        }

        // 3. Convertir fecha si viene
        const data: any = { ...dto };
        if (dto.dateOfBirth) {
            data.dateOfBirth = new Date(dto.dateOfBirth);
        }

        // 4. Actualizar
        return this.prisma.child.update({
            where: { id: childId },
            data: data,
        });
    }

    /**
     * Soft Delete: Marca al alumno como inactivo en lugar de borrarlo.
     * Desactiva también su tarjeta para evitar compras.
     */
    async deleteChild(childId: number, userId: number, userRoles: string[]) {
        const child = await this.prisma.child.findUnique({ where: { id: childId }, include: { card: true } });
        if (!child) throw new NotFoundException('Alumno no encontrado');

        if (userRoles.includes(Role.PARENT) && child.parentId !== userId) {
            throw new ForbiddenException('No tienes permiso para eliminar este alumno.');
        }

        // Transacción para desactivar alumno y bloquear tarjeta
        return this.prisma.$transaction(async (tx) => {
            // 1. Bloquear tarjeta si existe
            if (child.card) {
                await tx.card.update({
                    where: { id: child.card.id },
                    data: { isBlocked: true }
                });
            }

            // 2. Desactivar alumno
            return tx.child.update({
                where: { id: childId },
                data: { isActive: false }
            });
        });
    }

    /**
     * Reactivar Alumno (Deshacer borrado).
     */
    async reactivateChild(childId: number, userId: number, userRoles: string[]) {
        const child = await this.prisma.child.findUnique({ where: { id: childId }, include: { card: true } });
        if (!child) throw new NotFoundException('Alumno no encontrado');

        if (userRoles.includes(Role.PARENT) && child.parentId !== userId) {
            throw new ForbiddenException('No tienes permiso para reactivar este alumno.');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Desbloquear tarjeta si existe
            if (child.card) {
                await tx.card.update({
                    where: { id: child.card.id },
                    data: { isBlocked: false }
                });
            }

            // 2. Reactivar alumno
            return tx.child.update({
                where: { id: childId },
                data: { isActive: true }
            });
        });
    }

    /**
     * Soft Delete: Desactiva al usuario para que no pueda loguearse.
     */
    async delete(id: number, schoolId?: number): Promise<UserDto> {
        // Validar que no se esté borrando a sí mismo (opcional pero recomendado)
        // (Lo dejamos simple por ahora)
        try {
            const existing = await this.prisma.user.findFirst({ where: { id, ...(schoolId ? { schoolId } : {}) } });
            if (!existing) throw new NotFoundException(`Usuario con ID ${id} no encontrado en tu escuela.`);

            const user = await this.prisma.user.update({
                where: { id },
                data: { isActive: false }, // <-- CAMBIO A SOFT DELETE
            });
            return this.mapToDto(user);
        } catch (e) {
            // Manejo de error P2025 (Not found)
            throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
        }
    }

    /**
     * Reactivar Usuario.
     */
    async reactivate(id: number, schoolId?: number): Promise<UserDto> {
        try {
            const existing = await this.prisma.user.findFirst({ where: { id, ...(schoolId ? { schoolId } : {}) } });
            if (!existing) throw new NotFoundException(`Usuario con ID ${id} no encontrado en tu escuela.`);

            const user = await this.prisma.user.update({
                where: { id },
                data: { isActive: true },
            });
            return this.mapToDto(user);
        } catch (e) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
        }
    }

    /**
     * Bloquear la tarjeta de un hijo (Tarjeta Perdida).
     */
    async blockCard(childId: number, userId: number, userRoles: string[]) {
        const child = await this.prisma.child.findUnique({
            where: { id: childId },
            include: { card: true }
        });
        if (!child) throw new NotFoundException('Alumno no encontrado');

        if (userRoles.includes(Role.PARENT) && child.parentId !== userId) {
            throw new ForbiddenException('No tienes permiso para gestionar este alumno.');
        }

        if (!child.card) {
            throw new NotFoundException('El alumno no tiene una tarjeta vinculada.');
        }

        return this.prisma.card.update({
            where: { id: child.card.id },
            data: { isBlocked: true }
        });
    }
}
