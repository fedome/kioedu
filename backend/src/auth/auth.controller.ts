
// src/auth/auth.controller.ts
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenResponseDto } from './dto/token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { ApiCommonErrors } from '../common/swagger.decorators';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private auth: AuthService) {
    }

    @Post('signup')
    @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
    @ApiOperation({ summary: 'Crear usuario (rol por defecto: PARENT)' })
    @ApiOkResponse({ type: TokenResponseDto })
    @ApiBadRequestResponse({ description: 'Datos inválidos o email existente' })
    async signup(@Body() dto: SignupDto): Promise<{
        access_token: string;
        token_type: string;
        expires_in: `${number}ms` | `${number}s` | `${number}m` | `${number}h` | `${number}d` | `${number}w` | `${number}y`
    }> {
        return this.auth.signup(dto);
    }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login de usuario' })
    @ApiOkResponse({ type: TokenResponseDto })
    @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
    async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
        const { access_token } = await this.auth.login(dto);
        return { access_token, token_type: 'Bearer', expires_in: 1800 };
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Cambiar contraseña propia (Requiere pass actual)' })
    @ApiOkResponse({ description: 'Contraseña actualizada' })
    async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
        return this.auth.changePassword(req.user.sub, dto);
    }

    @Post('password/forgot')
    @Throttle({ default: { limit: 3, ttl: 60_000 } }) // 3 intentos por minuto por IP
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Solicitar recuperación de contraseña (envía link de reset)' })
    @ApiOkResponse({ description: 'Mensaje genérico (no revela si el email existe)' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.auth.forgotPassword(dto.email);
    }

    @Post('password/reset')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Restablecer contraseña con token de recuperación' })
    @ApiOkResponse({ description: 'Contraseña restablecida' })
    @ApiBadRequestResponse({ description: 'Token inválido o expirado' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.auth.resetPassword(dto.token, dto.newPassword);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado (con hijos)' })
    @ApiOkResponse({ description: 'Devuelve el usuario con sus hijos y saldos.' })
    @ApiCommonErrors()
    async getProfile(@Req() req: any) {
        return this.auth.getUserProfile(req.user.sub);
    }
}
