import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@ApiTags('Categories')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER, Role.PARENT)
    create(@Body() createCategoryDto: CreateCategoryDto, @Req() req: any) {
        return this.categoriesService.create(createCategoryDto, req.user.ownerId);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.categoriesService.findAll(req.user.ownerId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.categoriesService.findOne(+id, req.user.ownerId);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER, Role.PARENT)
    update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto, @Req() req: any) {
        return this.categoriesService.update(+id, updateCategoryDto, req.user.ownerId);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER, Role.PARENT)
    remove(@Param('id') id: string, @Req() req: any) {
        return this.categoriesService.remove(+id, req.user.ownerId);
    }
}
