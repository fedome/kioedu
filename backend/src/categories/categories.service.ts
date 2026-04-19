import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    create(createCategoryDto: CreateCategoryDto, ownerId: number) {
        return this.prisma.category.create({
            data: { ...createCategoryDto, ownerId },
        });
    }

    findAll(ownerId: number) {
        return this.prisma.category.findMany({
            where: { isActive: true, ownerId },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: number, ownerId: number) {
        const category = await this.prisma.category.findFirst({
            where: { id, ownerId },
        });
        if (!category) throw new NotFoundException(`Category #${id} not found`);
        return category;
    }

    async update(id: number, updateCategoryDto: UpdateCategoryDto, ownerId: number) {
        await this.findOne(id, ownerId); // Ensure exists for this owner
        return this.prisma.category.update({
            where: { id },
            data: updateCategoryDto,
        });
    }

    async remove(id: number, ownerId: number) {
        await this.findOne(id, ownerId); // Ensure exists for this owner
        // Soft delete
        return this.prisma.category.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
