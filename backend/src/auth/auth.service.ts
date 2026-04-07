import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '@prisma/client';
import { Role } from './roles.enum';
import { JWT_EXPIRES_IN } from "./constants";
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';

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
        return this.signToken(user.id, user.email, roles);
    }

    private async signToken(sub: number, email: string, roles: string[]) {
        const payload = { sub, email, roles };
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

        // TODO: Integrar con servicio de email (Nodemailer/SendGrid/Resend)
        // Por ahora retornamos el token directamente para testing
        this.logger.log(`Password reset token generated for user #${user.id}`);

        return {
            message: genericMessage,
            // ⚠️ SOLO PARA DESARROLLO — Quitar en producción
            _dev_reset_token: resetToken,
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
