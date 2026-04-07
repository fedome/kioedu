import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);
  constructor(private prisma: PrismaService) { }

  /**
   * Crea una nueva Orden de Compra (PurchaseOrder) y sus ítems.
   */
  async create(dto: CreatePurchaseOrderDto) {
    // Calculamos el costo total de la orden
    const totalCostCents = dto.items.reduce(
      (acc, item) => acc + item.unitCostCents * item.quantity,
      0,
    );

    return this.prisma.purchaseOrder.create({
      data: {
        supplierId: dto.supplierId,
        status: dto.status ?? 'SUBMITTED',
        totalCostCents: totalCostCents,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCostCents: item.unitCostCents,
          })),
        },
      },
      include: {
        items: true, // Devuelve la orden creada con sus ítems
      },
    });
  }

  /**
   * Marca una Orden de Compra como 'RECEIVED' (Recibida).
   * Soporta recibir cantidades reales, nuevos costos, lotes y vencimientos.
   */
  async receiveOrder(orderId: number, userId: number, itemsReceived: any[]) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Buscar la orden
      const order = await tx.purchaseOrder.findUnique({
        where: { id: orderId },
        include: { supplier: true },
      });

      if (!order) {
        throw new NotFoundException(`Orden de Compra con ID ${orderId} no encontrada.`);
      }
      if (order.status === 'RECEIVED') {
        throw new NotFoundException(`La Orden ${orderId} ya fue recibida.`);
      }

      let actualTotalCents = 0;

      // 2. Procesar cada ítem recibido
      for (const item of itemsReceived) {
        // item: { productId, quantity, unitCostCents, expirationDate, batchNumber }
        const productId = Number(item.productId);
        const qty = Number(item.quantity);
        const cost = Number(item.unitCostCents);
        const expDate = item.expirationDate ? new Date(item.expirationDate) : null;

        if (qty <= 0) continue;

        actualTotalCents += qty * cost;

        // 2a. Crear el Lote (ProductBatch)
        await tx.productBatch.create({
          data: {
            productId: productId,
            quantity: qty,
            unitCostCents: cost,
            expirationDate: expDate,
            provider: order.supplier.name,
            invoiceNumber: item.batchNumber || null,
            createdBy: userId,
          },
        });

        // 2b. Actualizar el Producto (Stock y Costo)
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQuantity: { increment: qty },
            costCents: cost, // Mantener el costo más reciente
          },
        });

        // 2c. Crear el Movimiento de Stock
        await tx.stockMovement.create({
          data: {
            productId: productId,
            type: 'PURCHASE',
            qtyDelta: qty,
            reason: `Recepción O.C. #${order.id}${item.batchNumber ? ' Lote: ' + item.batchNumber : ''}`,
            relatedId: `po_root:${order.id}`,
            unitCostCentsSnapshot: cost,
            userId: userId,
          },
        });
      }

      // 3. Finalizar la Orden
      return tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
          totalCostCents: actualTotalCents, // Actualizar con lo real
        },
      });
    });
  }

  async findAll() {
    return this.prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true, priceCents: true, costCents: true } } } },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: { select: { id: true, name: true, priceCents: true, costCents: true } } } },
      },
    });
  }

  async submitOrder(id: number) {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  // --- Shopping List Logic (Drafts) ---

  async getDrafts() {
    return this.prisma.purchaseOrder.findMany({
      where: { status: 'DRAFT' },
      include: {
        supplier: true,
        items: { include: { product: { select: { name: true, barcode: true } } } },
      },
    });
  }

  async addToDraft(dto: { supplierId: number; productId: number; quantity: number }) {
    // 1. Buscar si ya existe un borrador para este proveedor
    let draft = await this.prisma.purchaseOrder.findFirst({
      where: { supplierId: dto.supplierId, status: 'DRAFT' },
      include: { items: true },
    });

    // 2. Si no existe, crearlo
    if (!draft) {
      draft = await this.prisma.purchaseOrder.create({
        data: {
          supplierId: dto.supplierId,
          status: 'DRAFT',
          totalCostCents: 0, // Se recalcula luego
        },
        include: { items: true },
      });
    }

    // 3. Buscar si el ítem ya existe en el borrador
    const existingItem = draft.items.find((i) => i.productId === dto.productId);

    if (existingItem) {
      // Actualizar cantidad
      await this.prisma.purchaseOrderItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: dto.quantity } },
      });
    } else {
      // Agregar nuevo ítem
      // Buscamos el costo actual del producto para tener referencia
      const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      const unitCost = product?.costCents || 0;

      await this.prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: draft.id,
          productId: dto.productId,
          quantity: dto.quantity,
          unitCostCents: unitCost,
        },
      });
    }

    // 4. Retornar el draft actualizado
    return this.findOne(draft.id);
  }

  /**
   * Verifica si el producto bajó del mínimo y lo agrega al pedido del proveedor principal.
   */
  async checkAndReplenish(productId: number, tx: Prisma.TransactionClient) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minStockLevel: true,
        supplierId: true,
        costCents: true
      },
    });

    if (!product || !product.supplierId) return;

    // Solo reponer si está por debajo del mínimo rastreable
    if (product.stockQuantity <= product.minStockLevel) {
      // 1. Buscar si ya existe un borrador para este proveedor
      let draft = await tx.purchaseOrder.findFirst({
        where: { supplierId: product.supplierId, status: 'DRAFT' },
        include: { items: true },
      });

      if (!draft) {
        draft = await tx.purchaseOrder.create({
          data: {
            supplierId: product.supplierId,
            status: 'DRAFT',
            totalCostCents: 0,
          },
          include: { items: true },
        });
      }

      const existingItem = draft.items.find((i) => i.productId === product.id);

      if (!existingItem) {
        // Sugerir cantidad: duplicar el mínimo o 5 unidades mínimo
        const suggestedQty = Math.max(product.minStockLevel * 2, 5);

        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: draft.id,
            productId: product.id,
            quantity: suggestedQty,
            unitCostCents: product.costCents || 0,
          },
        });

        this.logger.log(`Producto ${product.name} agregado a lista de compras de proveedor ${product.supplierId}`);
      }
    }
  }
}