import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopupDto } from './dto/create-topup.dto';
import {
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from '@prisma/client';
import { Role } from '../auth/roles.enum';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) { }

  async createPendingTopup(dto: CreateTopupDto, userId: number, userRole: Role) {
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
      include: { accounts: true },
    });

    if (!child || !child.accounts || child.accounts.length === 0) {
      throw new NotFoundException('Alumno o cuenta no encontrada.');
    }

    if (userRole === Role.PARENT && child.parentId !== userId) {
      throw new ForbiddenException('No puedes recargar a un alumno que no es tu hijo.');
    }

    return this.prisma.transaction.create({
      data: {
        type: TransactionType.TOPUP,
        status: TransactionStatus.PENDING,
        paymentMethod: PaymentMethod.MERCADOPAGO,
        subTotalCents: dto.amountCents,
        taxCents: 0,
        totalCents: dto.amountCents,
        ownerId: child.accounts[0].ownerId,
        cashierId: userId,
        terminalId: 0,
        accountId: child.accounts[0].id,
        externalRef: `mp-pending-${Date.now()}`,
      },
      include: {
        account: {
          include: {
            child: true,
            owner: true
          }
        }
      }
    });
  }

  async getOwnerMpTokenByTransaction(transactionId: number): Promise<string | null> {
    const trx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { owner: true }
    });
    return trx?.owner?.mpAccessToken || null;
  }

  async completeTopupPayment(transactionId: number, externalPaymentId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { account: { include: { child: true } } },
    });

    if (!transaction) {
      throw new NotFoundException(`Transacción #${transactionId} no encontrada`);
    }

    if (transaction.status === TransactionStatus.PAID) {
      return transaction; // Ya procesada
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar transacción
      const updatedTrx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.PAID,
          completedAt: new Date(),
          mpPaymentId: externalPaymentId,
        },
      });

      // 2. Incrementar saldo
      await tx.account.update({
        where: { id: transaction.accountId as number },
        data: { balanceCents: { increment: transaction.totalCents } },
      });

      // 3. Notificar (intentar)
      if (transaction.account?.child?.parentId) {
        try {
          await this.notifications.notifyMovement({
            userId: transaction.account.child.parentId ?? undefined,
            childName: `${transaction.account.child.firstName} ${transaction.account.child.lastName}`.trim(),
            amountCents: transaction.totalCents,
            type: 'TOPUP',
          });
        } catch (e) {
          this.logger.warn(`Error al notificar pago MP: ${e.message}`);
        }
      }

      return updatedTrx;
    });
  }

  async createTopup(dto: CreateTopupDto, userId: number, userRole: Role) {
    // valores que vamos a usar LUEGO para la notificación
    let parentIdForNotification: number | null = null;
    let childFullNameForNotification = '';

    const transaction = await this.prisma.$transaction(async (tx) => {
      // 1. Buscar al hijo y su cuenta
      const child = await tx.child.findUnique({
        where: { id: dto.childId },
        include: { accounts: true },
      });

      if (!child || !child.accounts || child.accounts.length === 0) {
        throw new NotFoundException('Alumno o cuenta no encontrada.');
      }

      // 2. Validar que el padre sea el dueño (Seguridad)
      if (userRole === Role.PARENT && child.parentId !== userId) {
        throw new ForbiddenException(
          'No puedes recargar a un alumno que no es tu hijo.',
        );
      }

      // guardamos datos para la notificación
      parentIdForNotification = child.parentId;
      childFullNameForNotification = `${child.firstName} ${child.lastName}`.trim();

      // 3. Crear la Transacción (Tipo TOPUP)
      let dbMethod: PaymentMethod = PaymentMethod.WALLET;
      let status: TransactionStatus = TransactionStatus.PAID;

      if (dto.paymentMethod === 'mp') dbMethod = PaymentMethod.MERCADOPAGO;
      if (dto.paymentMethod === 'cash') {
        dbMethod = PaymentMethod.CASH;
        // Si el usuario es PARENT, la recarga en cash DEBE ser aprobada por el kiosco
        const normalizedRole = String(userRole).toUpperCase();
        if (normalizedRole === Role.PARENT) {
          status = TransactionStatus.PENDING;
        }
      }

      const trx = await tx.transaction.create({
        data: {
          type: TransactionType.TOPUP,
          status: status,
          paymentMethod: dbMethod,
          subTotalCents: dto.amountCents,
          taxCents: 0,
          totalCents: dto.amountCents,
          ownerId: child.accounts[0].ownerId,
          cashierId: userId,
          terminalId: 0,
          startedAt: new Date(),
          completedAt: status === TransactionStatus.PAID ? new Date() : null,
          accountId: child.accounts[0].id,
          externalRef: dto.paymentMethod === 'mp' ? `mp-${Date.now()}` : `cash-${Date.now()}`,
        },
      });

      // 4. Acreditar el Saldo (Solo si está pagada)
      if (status === TransactionStatus.PAID) {
        await tx.account.update({
          where: { id: child.accounts[0].id },
          data: { balanceCents: { increment: dto.amountCents } },
        });
      }

      return trx;
    });

    // 5. Notificar al padre por push (FUERA del $transaction)
    if (parentIdForNotification) {
      try {
        await this.notifications.notifyMovement({
          userId: parentIdForNotification,
          childName: childFullNameForNotification,
          amountCents: transaction.totalCents,
          type: 'TOPUP',
        });
      } catch (err) {
        // si FCM falla, la recarga igual queda OK
        this.logger.warn(
          `No se pudo enviar la notificación de recarga al usuario ${parentIdForNotification}: ${err}`,
        );
      }
    }

    return transaction;
  }

  async cancelTopup(transactionId: number, userId: number) {
    const trx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!trx) throw new NotFoundException('Recarga no encontrada');
    if (trx.status !== TransactionStatus.PENDING) {
      throw new ForbiddenException('Solo se pueden cancelar recargas pendientes');
    }

    // El cashierId en este flujo (topup desde app) es el userId del padre
    if (trx.cashierId !== userId) {
      throw new ForbiddenException('No tenés permiso para cancelar esta recarga');
    }

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.CANCELED },
    });
  }

  async getOwnerMpInfoBySchool(schoolId: number) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: { owners: true }
    });
    return school?.owners?.[0] || null;
  }

  async updateOwnerMpTokenBySchool(schoolId: number, accessToken: string, publicKey: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: { owners: true }
    });
    
    if (!school || !school.owners || school.owners.length === 0) {
      throw new NotFoundException('Dueño de escuela no encontrado');
    }

    return this.prisma.owner.update({
      where: { id: school.owners[0].id },
      data: {
        mpAccessToken: accessToken,
        mpPublicKey: publicKey
      }
    });
  }
}
