import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
// Importamos los Enums V2
import { PaymentMethod, TransactionStatus } from '@prisma/client';

const TZ = 'America/Argentina/Buenos_Aires';

@Injectable()
export class LimitsService {
    constructor(private prisma: PrismaService) {}

    // (setDailyLimit y getDailyLimit no cambian)
    async setDailyLimit(
      childId: number,
      limitCents: number | null,
      user: any,
    ): Promise<{ childId: number; limitCents: number | null; updatedAt: Date }> {
        const child = await this.prisma.child.findUnique({ where: { id: childId } });
        if (!child) throw new NotFoundException('Child not found');

        if (user.role === 'PARENT') {
            if (child.parentId !== user.userId) {
                throw new ForbiddenException(
                  'No puedes modificar el límite de un alumno que no es tu hijo.',
                );
            }
        }

        // Sin límite → borro el registro si existe
        if (limitCents === null) {
            const deleted = await this.prisma.dailyLimit
              .delete({
                  where: { childId },
              })
              .catch(() => null); // si no existe, no importa

            return {
                childId,
                limitCents: null,
                updatedAt: deleted?.updatedAt ?? new Date(),
            };
        }

        // Con límite → upsert
        const dl = await this.prisma.dailyLimit.upsert({
            where: { childId },
            update: { limitCents },
            create: { childId, limitCents },
        });

        return {
            childId: dl.childId,
            limitCents: dl.limitCents,
            updatedAt: dl.updatedAt,
        };
    }

    async getDailyLimit(childId: number) {
        const dl = await this.prisma.dailyLimit.findFirst({ where: { childId } });
        return { childId, limitCents: dl?.limitCents ?? null };
    }


    /**
     * Hito EDU: Refactorizado para V2.
     * Suma de débitos del día en la zona horaria local (AR).
     * Suma solo transacciones V2 'PAID', 'CARD', del 'accountId' correcto.
     */
    async getTodayDebitedCents(childId: number): Promise<number> {
        // 1. Encontrar la cuenta (V1)
        const account = await this.prisma.account.findFirst({ where: { childId } });
        if (!account) return 0; // Si no tiene cuenta, no ha gastado

        // 2. Definir rango de fechas (Sin cambios)
        const now = new Date();
        const nowZoned = toZonedTime(now, TZ)
        const dayStartZoned = startOfDay(nowZoned)
        const dayEndZoned = endOfDay(nowZoned);
        const startUtc = fromZonedTime(dayStartZoned, TZ);
        const endUtc   = fromZonedTime(dayEndZoned, TZ);

        // 3. Consultar Transacciones V2
        const agg = await this.prisma.transaction.aggregate({
            where: {
                accountId: account.id, // <-- Relación V2 "Edu"
                status: TransactionStatus.PAID, // <-- Enum V2
                paymentMethod: PaymentMethod.CARD, // <-- Enum V2
                completedAt: { gte: startUtc, lte: endUtc }, // V2: usamos 'completedAt'
            },
            _sum: {
                totalCents: true, // V2: usamos 'totalCents'
            },
        });

        return agg._sum.totalCents ?? 0;
    }

    // Ejemplo: UsersService.getMyChildren(userId: number)
    async getMyChildren(userId: number) {
        return this.prisma.child.findMany({
            where: { parentId: userId },
            include: {
                school: {
                    select: { id: true, name: true },
                },
                accounts: {
                    select: { id: true, balanceCents: true },
                },
                dailyLimit: true,            // 👈 IMPORTANTE
                card: {                      // 👈 si querés también mostrar info de tarjeta
                    select: {
                        uidHex: true,
                        isBlocked: true,
                    },
                },
            },
        });
    }

}