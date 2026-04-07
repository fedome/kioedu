import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    create(createCategoryDto: CreateCategoryDto) {
        return this.prisma.category.create({
            data: { ...createCategoryDto, ownerId: 1 },
        });
    }

    findAll() {
        return this.prisma.category.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: number) {
        const category = await this.prisma.category.findUnique({
            where: { id },
        });
        if (!category) throw new NotFoundException(`Category #${id} not found`);
        return category;
    }

    async update(id: number, updateCategoryDto: UpdateCategoryDto) {
        await this.findOne(id); // Ensure exists
        return this.prisma.category.update({
            where: { id },
            data: updateCategoryDto,
        });
    }

    async remove(id: number) {
        await this.findOne(id); // Ensure exists
        // Soft delete
        return this.prisma.category.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
