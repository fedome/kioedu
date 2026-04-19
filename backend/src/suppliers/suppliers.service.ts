import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) { }

    async create(createSupplierDto: CreateSupplierDto, ownerId: number) {
        // Validar CUIT único si se envía
        if (createSupplierDto.cuit) {
            const exists = await this.prisma.supplier.findFirst({
                where: { cuit: createSupplierDto.cuit, ownerId },
            });
            if (exists) {
                throw new BadRequestException('Ya existe un proveedor con ese CUIT.');
            }
        }

        return this.prisma.supplier.create({
            data: { ...createSupplierDto, ownerId },
        });
    }

    async findAll(query: string = '', ownerId: number) {
        return this.prisma.supplier.findMany({
            where: {
                ownerId,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { cuit: { contains: query } },
                ],
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: number, ownerId: number) {
        const supplier = await this.prisma.supplier.findFirst({
            where: { id, ownerId },
            include: {
                _count: { select: { purchaseOrders: true } } // Contamos órdenes históricas
            }
        });
        if (!supplier) throw new NotFoundException(`Proveedor #${id} no encontrado`);
        return supplier;
    }

    async update(id: number, updateSupplierDto: UpdateSupplierDto, ownerId: number) {
        const supplier = await this.prisma.supplier.findFirst({ where: { id, ownerId } });
        if (!supplier) throw new NotFoundException(`Proveedor #${id} no encontrado`);

        // Validar CUIT único al actualizar (excluyendo el propio ID)
        if (updateSupplierDto.cuit && updateSupplierDto.cuit !== supplier.cuit) {
            const exists = await this.prisma.supplier.findFirst({
                where: { cuit: updateSupplierDto.cuit, id: { not: id }, ownerId },
            });
            if (exists) {
                throw new BadRequestException('Ya existe un proveedor con ese CUIT.');
            }
        }

        return this.prisma.supplier.update({
            where: { id },
            data: updateSupplierDto,
        });
    }

    async remove(id: number, ownerId: number) {
        // Enforce ownerId check
        await this.findOne(id, ownerId);

        // Validar si tiene compras asociadas
        const count = await this.prisma.purchaseOrder.count({ where: { supplierId: id } });
        if (count > 0) {
            throw new Error(`No se puede eliminar: El proveedor tiene ${count} órdenes de compra asociadas.`);
        }

        return this.prisma.supplier.delete({
            where: { id },
        });
    }
}
