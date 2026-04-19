import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '@prisma/client';
import { Role } from './roles.enum';
import { JWT_EXPIRES_IN } from "./constants";
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(private users: UsersService, private jwt: JwtService, private prisma: PrismaService) { }

    async signup(dto: SignupDto) {
        try {
            const exists = await this.users.findByEmail(dto.email);
            if (exists) throw new ConflictException('Email ya registrado');

            const user = await this.users.create({
                name: dto.name,
                email: dto.email,
                password: dto.password,
                roles: [Role.PARENT], // Siempre PARENT — nunca confiar en el cliente
            });

            return this.signToken(user.id, user.email, user.roles);

        } catch (e: any) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException('Email ya registrado');
            }
            throw e;
        }
    }

    /**
     * Registra un negocio completo: School + Owner + Kiosk + User ADMIN + roles base.
     * Endpoint público para onboarding de dueños de kioscos.
     */
    async registerBusiness(dto: RegisterBusinessDto) {
        const normalizedEmail = dto.email.trim().toLowerCase();

        // Verificar si el email ya existe
        const exists = await this.users.findByEmail(normalizedEmail);
        if (exists) throw new ConflictException('Este email ya está registrado.');

        const hash = await bcrypt.hash(dto.password, 12);
        const apiKey = `kiosk_${randomUUID().replace(/-/g, '')}`;

        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Crear la escuela
            const school = await tx.school.create({
                data: { name: dto.schoolName },
            });

            // 2. Crear el owner (dueño del negocio)
            const owner = await tx.owner.create({
                data: { name: dto.ownerName, schoolId: school.id },
            });

            // 3. Crear el kiosco con API key auto-generada
            const kiosk = await tx.kiosk.create({
                data: {
                    name: dto.kioskName || 'Kiosco Principal',
                    schoolId: school.id,
                    ownerId: owner.id,
                    apiKey,
                    subscriptionActive: true,
                },
            });

            // 4. Crear roles base para la escuela
            const rolesData = [
                { name: 'ADMIN', description: 'Acceso total', schoolId: school.id, isPosRole: true },
                { name: 'CASHIER', description: 'Cajero POS', schoolId: school.id, isPosRole: true },
                { name: 'ENCARGADO', description: 'Gestión stock/reportes', schoolId: school.id, isPosRole: true },
            ];

            const createdRoles: Record<string, any> = {};
            for (const r of rolesData) {
                // Buscar si el rol ya existe (roles son globales por name unique)
                let role = await tx.role.findUnique({ where: { name: r.name } });
                if (!role) {
                    role = await tx.role.create({ data: r });
                }
                createdRoles[r.name] = role;
            }

            // 5. Crear el usuario admin del negocio
            const user = await tx.user.create({
                data: {
                    name: dto.ownerName,
                    email: normalizedEmail,
                    password: hash,
                    isActive: true,
                    schoolId: school.id,
                    roles: {
                        create: [{ roleId: createdRoles['ADMIN'].id }],
                    },
                },
                include: { roles: { include: { role: true } } },
            });

            return { user, school, owner, kiosk };
        });

        // Generar JWT para auto-login
        const roles = result.user.roles.map((ur: any) => ur.role.name);
        const tokenData = await this.signToken(result.user.id, normalizedEmail, roles, result.school.id, result.owner.id);

        return {
            ...tokenData,
            schoolId: result.school.id,
            ownerId: result.owner.id,
            kioskId: result.kiosk.id,
            kioskApiKey: apiKey,
        };
    }

    async login(dto: LoginDto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.users.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');
        }

        const ok = await bcrypt.compare(dto.password, user.password);
        if (!ok) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const roles = user.roles.map((ur: any) => ur.role.name);
        let ownerId: number | undefined = undefined;

        if (user.schoolId) {
            const owner = await this.prisma.owner.findFirst({ where: { schoolId: user.schoolId } });
            if (owner) {
                ownerId = owner.id;
            }
        }

        return this.signToken(user.id, user.email, roles, user.schoolId ?? undefined, ownerId);
    }

    private async signToken(sub: number, email: string, roles: string[], schoolId?: number, ownerId?: number) {
        const payload = { sub, email, roles, schoolId, ownerId };
        const secret = process.env.JWT_SECRET;

        const access_token = await this.jwt.signAsync(payload, {
            secret: secret,
            expiresIn: JWT_EXPIRES_IN,
        });
        return {
            access_token,
            token_type: 'Bearer',
            expires_in: JWT_EXPIRES_IN,
        };
    }

    async changePassword(userId: number, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('La contraseña actual es incorrecta');
        }

        const newHash = await bcrypt.hash(dto.newPassword, 12);

        await this.prisma.user.update({
            where: { id: userId },
            data: { password: newHash },
        });

        return { message: 'Contraseña actualizada correctamente' };
    }

    // ===================================================================
    // PASSWORD RECOVERY
    // ===================================================================

    /**
     * Genera un token JWT de reset y lo retorna.
     * En producción se debería enviar por email.
     * NUNCA revela si el email existe o no (previene enumeración de usuarios).
     */
    async forgotPassword(email: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.users.findByEmail(normalizedEmail);

        // Siempre retornar el mismo mensaje (no revelar si el email existe)
        const genericMessage = 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.';

        if (!user || !user.isActive) {
            this.logger.log(`Password reset requested for non-existent/inactive email`);
            return { message: genericMessage };
        }

        // Token JWT dedicado al reset, con purpose para evitar reutilización como auth token
        const resetToken = await this.jwt.signAsync(
            { sub: user.id, email: user.email, purpose: 'password-reset' },
            { secret: process.env.JWT_SECRET, expiresIn: '15m' },
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            await transporter.sendMail({
                from: `"KioEdu Seguridad" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: 'Restablecimiento de contraseña',
                html: `
                    <h2>Restablecer contraseña</h2>
                    <p>Has solicitado restablecer tu contraseña en KioEdu.</p>
                    <p>Haz clic en el siguiente enlace para continuar:</p>
                    <a href="${resetLink}">${resetLink}</a>
                    <br><br>
                    <p>Si no fuiste tú, ignora este correo.</p>
                    <p>Este enlace expirará en 15 minutos.</p>
                `,
            });
            this.logger.log(`Password reset email sent to user #${user.id}`);
        } catch (error) {
            this.logger.error(`Failed to send password reset email to user #${user.id}:`, error);
        }

        return {
            message: genericMessage,
            // ⚠️ SOLO PARA DESARROLLO — Removido en producción por seguridad
            // _dev_reset_token: resetToken, 
        };
    }

    /**
     * Valida el token de reset y cambia la contraseña.
     */
    async resetPassword(token: string, newPassword: string) {
        let payload: { sub: number; email: string; purpose: string };

        try {
            payload = await this.jwt.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
            });
        } catch {
            throw new BadRequestException('El link de recuperación es inválido o expiró. Solicitá uno nuevo.');
        }

        // Verificar que sea un token de reset, no un token de sesión reutilizado
        if (payload.purpose !== 'password-reset') {
            throw new BadRequestException('Token inválido para esta operación.');
        }

        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.isActive) {
            throw new BadRequestException('Usuario no encontrado o inactivo.');
        }

        const newHash = await bcrypt.hash(newPassword, 12);

        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: newHash },
        });

        this.logger.log(`Password reset successful for user #${user.id}`);
        return { message: 'Contraseña restablecida correctamente. Ya podés iniciar sesión.' };
    }

    async getUserProfile(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                roles: {
                    include: { role: true }
                },
                children: {
                    where: {
                        isActive: true
                    },
                    include: {
                        school: { select: { name: true } },
                        accounts: { select: { balanceCents: true } },
                        card: { select: { uidHex: true, isBlocked: true } },
                        dailyLimit: { select: { limitCents: true } },
                    }
                }
            }
        });

        if (!user) return null;

        return {
            ...user,
            roles: user.roles.map((ur: any) => ur.role.name)
        };
    }
}
