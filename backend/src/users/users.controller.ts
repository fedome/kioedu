import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    ParseIntPipe,
    UseGuards,
    Query,
    ValidationPipe, Put, Req, Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { UserDto } from './dto/user.dto';
import { ApiCommonErrors } from '../common/swagger.decorators';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { AssignCardDto } from './dto/assign-card.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@ApiTags('Users (Admin)')
@ApiBearerAuth('JWT')
// 1. Proteger TODO el controlador con guardianes
@UseGuards(JwtAuthGuard, RolesGuard)
// 2. Exigir rol de ADMIN para todas las rutas
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo usuario (Cajero o Admin)' })
    @ApiCreatedResponse({ type: UserDto })
    @ApiCommonErrors()
    create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos los usuarios (filtrar por rol)' })
    @ApiQuery({ name: 'role', type: String, required: false })
    @ApiQuery({ name: 'schoolId', type: Number, required: false })
    @ApiOkResponse({ type: [UserDto] })
    @ApiCommonErrors()
    findAll(@Query('role') role?: string, @Query('schoolId') schoolId?: string): Promise<UserDto[]> {
        return this.usersService.findAll(schoolId ? Number(schoolId) : undefined, role);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un usuario por ID' })
    @ApiOkResponse({ type: UserDto })
    @ApiCommonErrors()
    findOne(@Param('id', ParseIntPipe) id: number): Promise<UserDto | null> {
        return this.usersService.findById(id);
    }

    /*@Delete(':id')
    @ApiOperation({ summary: 'Eliminar un usuario por ID' })
    @ApiOkResponse({ type: UserDto })
    @ApiCommonErrors()
    remove(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
        return this.usersService.delete(id);
    }*/

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un usuario (nombre, email, rol)' })
    @ApiOkResponse({ type: UserDto })
    @ApiCommonErrors()
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<UserDto> {
        return this.usersService.update(id, updateUserDto);
    }

    @Put(':id/password')
    @ApiOperation({ summary: 'Resetear la contraseña de un usuario' })
    @ApiOkResponse({ type: UserDto })
    @ApiCommonErrors()
    resetPassword(
        @Param('id', ParseIntPipe) id: number,
        @Body() resetPasswordDto: ResetPasswordDto,
    ): Promise<UserDto> {
        return this.usersService.resetPassword(id, resetPasswordDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Desactivar usuario (Soft Delete)' }) // Actualiza la descripción
    @ApiOkResponse({ type: UserDto })
    @ApiCommonErrors()
    remove(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
        return this.usersService.delete(id);
    }

    // --- NUEVO ENDPOINT ---
    @Post(':id/reactivate')
    @ApiOperation({ summary: 'Reactivar un usuario desactivado' })
    @ApiOkResponse({ type: UserDto })
    @ApiCommonErrors()
    reactivate(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
        return this.usersService.reactivate(id);
    }

    @Post('me/children')
    @ApiOperation({ summary: 'Agregar un hijo al usuario actual' })
    // Permitimos que PARENT use esto también
    @Roles(Role.ADMIN, Role.PARENT)
    createChild(@Req() req: any, @Body() dto: CreateChildDto) {
        return this.usersService.addChild(req.user.sub, dto);
    }

    @Post('children/:childId/card')
    @ApiOperation({ summary: 'Vincular una tarjeta física a un hijo' })
    @Roles(Role.ADMIN, Role.PARENT)
    @ApiCreatedResponse()
    @ApiCommonErrors()
    assignCard(
        @Param('childId', ParseIntPipe) childId: number,
        @Body() dto: AssignCardDto,
        @Req() req: any,
    ) {
        return this.usersService.assignCard(
            childId,
            dto,
            req.user.sub,   // id del usuario logueado
            req.user.roles,  // roles (array de strings)
        );
    }

    @Patch('children/:id')
    @ApiOperation({ summary: 'Actualizar datos de un hijo (Nombre, Curso, etc.)' })
    @Roles(Role.ADMIN, Role.PARENT)
    @ApiOkResponse()
    @ApiCommonErrors()
    updateChild(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateChildDto,
        @Req() req: any
    ) {
        return this.usersService.updateChild(id, dto, req.user.sub, req.user.roles);
    }

    @Delete('children/:id')
    @ApiOperation({ summary: 'Desactivar un hijo (Soft Delete)' })
    @Roles(Role.ADMIN, Role.PARENT)
    deleteChild(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.usersService.deleteChild(id, req.user.sub, req.user.roles);
    }

    @Post('children/:id/reactivate')
    @ApiOperation({ summary: 'Reactivar un hijo previamente eliminado' })
    @Roles(Role.ADMIN, Role.PARENT)
    @ApiOkResponse()
    @ApiCommonErrors()
    reactivateChild(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.usersService.reactivateChild(id, req.user.sub, req.user.roles);
    }

    @Patch('children/:id/block-card')
    @ApiOperation({ summary: 'Bloquear la tarjeta de un hijo (Perdida)' })
    @Roles(Role.ADMIN, Role.PARENT)
    @ApiOkResponse()
    @ApiCommonErrors()
    blockCard(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.usersService.blockCard(id, req.user.sub, req.user.roles);
    }
}
