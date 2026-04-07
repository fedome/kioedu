import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Prisma } from '@prisma/client';
import { AddStockDto } from './dto/add-stock.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Crear producto (Inicia con stock 0, el stock se agrega por Lotes después)
   */
  async create(dto: CreateProductDto) {
    const { minStock, ...rest } = dto;

    try {
      let finalImageUrl = dto.imageUrl;
      const normalizedTerm = dto.name.toLowerCase().trim();

      if (finalImageUrl) {
        this.prisma.globalProductImage.upsert({
          where: { term: normalizedTerm },
          update: { imageUrl: finalImageUrl },
          create: { term: normalizedTerm, imageUrl: finalImageUrl }
        }).catch(() => {}); // fire and forget
      } else {
        const globalImg = await this.prisma.globalProductImage.findUnique({
          where: { term: normalizedTerm }
        });
        if (globalImg) finalImageUrl = globalImg.imageUrl;
      }

      return await this.prisma.product.create({
        data: {
          ownerId: 1, // TODO: Debería venir del contexto del usuario/kiosco
          ...rest,
          imageUrl: finalImageUrl,
          stockQuantity: 0,
          taxRate: dto.taxRate ? new Prisma.Decimal(dto.taxRate) : undefined,
          minStockLevel: minStock ?? 5,
          supplierId: dto.supplierId,
        },
        include: { categoryRel: true }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe un producto con ese código de barras.');
      }
      throw error;
    }
  }

  async findAll(query: string = '', lowStock: boolean = false, lastSync?: string) {
    const where: any = {};

    // 1. Filtro Texto
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query } },
      ];
    }

    // 2. Filtro Stock Bajo
    if (lowStock) {
      where.stockQuantity = { lte: 10 }; // Umbral harcodeado por ahora (o leer config)
      where.trackStock = true;
    }

    // 3. Sincronización Incremental
    // Si envían lastSync, traemos TODO lo modificado desde esa fecha (incluso inactivos/eliminados)
    // para que el cliente sepa que debe actualizarlos (y potencialmente desactivarlos).
    if (lastSync) {
      const date = new Date(lastSync);
      if (!isNaN(date.getTime())) {
        where.updatedAt = { gt: date };
        // IMPORTANTE: No filtramos isActive: true aquí, porque queremos saber si uno pasó a false
      } else {
        // Si no hay sync, por defecto solo activos (comportamiento anterior)
        // O podemos dejar que traiga todo. Depende la regla de negocio.
        // Asumimos que el POS filtra visualmente o usa isActive.
      }
    }

    return this.prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' }, // Ordenar por fecha de cambio ayuda
      include: {
        categoryRel: true,
        supplier: { select: { id: true, name: true } }, // Incluir proveedor para Shopping List
        batches: { where: { quantity: { gt: 0 } } } // Lotes con stock
      }
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id },
      include: { categoryRel: true }
    });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado.`);
    return product;
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, isActive: true },
      include: { categoryRel: true }
    });
    if (!product) throw new NotFoundException(`Producto ${barcode} no encontrado.`);
    return product;
  }

  async update(id: number, dto: UpdateProductDto, userId?: number) {
    const { stockQuantity, minStock, ...cleanDto } = dto as any;

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findFirst({
        where: { id },
        select: { priceCents: true, costCents: true, name: true, imageUrl: true }
      });

      if (!current) throw new NotFoundException(`Producto ${id} no encontrado.`);

      const updated = await tx.product.update({
        where: { id },
        data: {
          ...cleanDto,
          taxRate: dto.taxRate ? new Prisma.Decimal(dto.taxRate) : undefined,
          minStockLevel: minStock !== undefined ? minStock : undefined,
          supplierId: dto.supplierId !== undefined ? dto.supplierId : undefined,
        },
        include: { categoryRel: true }
      });

      if (dto.imageUrl && dto.imageUrl !== current.imageUrl) {
        const term = (dto.name || current.name).toLowerCase().trim();
        // Fire and forget upsert directly on prisma client (not within tx to avoid blocking)
        this.prisma.globalProductImage.upsert({
          where: { term },
          update: { imageUrl: dto.imageUrl },
          create: { term, imageUrl: dto.imageUrl }
        }).catch(() => {});
      }

      // Rastrear Historial de Precios/Costos si hubo cambios
      const priceChanged = dto.priceCents !== undefined && dto.priceCents !== current.priceCents;
      const costChanged = dto.costCents !== undefined && dto.costCents !== current.costCents;

      if (priceChanged || costChanged) {
        await tx.priceHistory.create({
          data: {
            productId: id,
            oldPriceCents: priceChanged ? current.priceCents : undefined,
            newPriceCents: priceChanged ? dto.priceCents : undefined,
            oldCostCents: costChanged ? current.costCents : undefined,
            newCostCents: costChanged ? dto.costCents : undefined,
            userId: userId || undefined,
          }
        });
      }

      return updated;
    });
  }

  async remove(id: number) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  }

  // --- GESTIÓN DE STOCK ---

  async addStock(
    productId: number,
    dto: AddStockDto,
    userId: number,
    expirationDate?: Date
  ) {
    return this.prisma.$transaction(async (tx) => {

      // 1. Crear el Lote con TODOS los datos
      const batch = await tx.productBatch.create({
        data: {
          productId,
          quantity: dto.quantity,
          unitCostCents: dto.costCents,
          expirationDate: expirationDate,

          // Datos de Gestión
          provider: dto.provider,
          invoiceNumber: dto.invoiceNumber,
          notes: dto.notes,
          createdBy: userId // Auditoría
        }
      });

      // 2. Calcular el nuevo total de stock
      const aggregation = await tx.productBatch.aggregate({
        where: { productId, quantity: { gt: 0 } }, // Sumar solo lotes con stock positivo
        _sum: { quantity: true }
      });

      const newTotal = aggregation._sum.quantity || 0;

      // 3. Actualizar el producto
      await tx.product.update({
        where: { id: productId },
        data: {
          stockQuantity: newTotal,
          // Opcional: Actualizar el costo del producto con el último costo ingresado
          // Esto es útil para mantener el precio actualizado
          costCents: dto.costCents ? dto.costCents : undefined
        }
      });

      return batch;
    });
  }

  async reconcile(productId: number, physicalStock: number, reason: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: productId } });
      if (!product) throw new NotFoundException('Producto no encontrado');

      const diff = physicalStock - product.stockQuantity;

      if (diff === 0) return product;

      // 1. Crear movimiento de ajuste
      await tx.stockMovement.create({
        data: {
          productId,
          type: 'RECONCILE',
          qtyDelta: diff,
          reason: reason || 'Ajuste de inventario físico',
          userId: userId,
          unitCostCentsSnapshot: product.costCents
        }
      });

      // 2. Actualizar stock del producto
      return tx.product.update({
        where: { id: productId },
        data: { stockQuantity: physicalStock }
      });
    });
  }

  async getDashboardMetrics() {
    const today = new Date();
    const limitDate = new Date();
    limitDate.setDate(today.getDate() + 30);

    const [lowStockCount, expiringBatches] = await Promise.all([
      this.prisma.product.count({
        where: {
          isActive: true,
          stockQuantity: { lte: 5 }
        }
      }),
      this.prisma.productBatch.findMany({
        where: {
          expirationDate: {
            gte: today,
            lte: limitDate
          },
          quantity: { gt: 0 }
        },
        include: {
          product: { select: { name: true } }
        },
        orderBy: { expirationDate: 'asc' },
        take: 5
      })
    ]);

    const formattedExpirations = expiringBatches.map(batch => {
      const diffTime = new Date(batch.expirationDate!).getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: batch.id,
        productName: batch.product.name,
        stock: batch.quantity,
        daysLeft: daysLeft
      };
    });

    return {
      lowStockItems: lowStockCount,
      expiringSoon: formattedExpirations
    };
  }
}