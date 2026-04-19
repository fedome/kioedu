import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role } from './roles.enum';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Roles & Permissions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    @ApiOperation({ summary: 'List all roles with their permissions' })
    findAllRoles(
        @Query('schoolId') schoolId?: string,
        @Query('onlyPos') onlyPos?: string
    ) {
        return this.rolesService.findAllRoles(
            schoolId ? Number(schoolId) : undefined,
            onlyPos === 'true'
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a role by ID' })
    findRoleById(@Param('id', ParseIntPipe) id: number) {
        return this.rolesService.findRoleById(id);
    }

    @Post()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Create a new role' })
    createRole(@Body() dto: { name: string; schoolId?: number; description?: string; permissionIds?: number[] }) {
        return this.rolesService.createRole(dto.name, dto.schoolId, dto.description, dto.permissionIds);
    }

    @Put(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Update a role' })
    updateRole(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: { name?: string; description?: string; permissionIds?: number[] }
    ) {
        return this.rolesService.updateRole(id, dto.name, dto.description, dto.permissionIds);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete a role' })
    deleteRole(@Param('id', ParseIntPipe) id: number) {
        return this.rolesService.deleteRole(id);
    }

    @Get('permissions/all')
    @ApiOperation({ summary: 'List all available permissions' })
    findAllPermissions() {
        return this.rolesService.findAllPermissions();
    }

    @Post('permissions')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Create a new permission' })
    createPermission(@Body() dto: { action: string; subject: string; description?: string }) {
        return this.rolesService.createPermission(dto.action, dto.subject, dto.description);
    }
}
