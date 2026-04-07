// src/notifications/notifications.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getFirebaseApp } from '../infra/firebase-admin.config';
import * as admin from 'firebase-admin';
import { PushPlatform } from '@prisma/client';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';   // 👈 IMPORTANTE

type PlatformDTO = RegisterDeviceTokenDto['platform']; // 'android' | 'ios'

export type NotificationKind =
  | 'MOVEMENT'
  | 'LOW_BALANCE'
  | 'LIMIT_REACHED'
  | 'NEWS';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private firebase: admin.app.App | null = null;

  constructor(private prisma: PrismaService) {
    try {
      this.firebase = getFirebaseApp();
      this.logger.log('Firebase Admin inicializado correctamente.');
    } catch (e: any) {
      this.logger.warn(
        `Firebase NO inicializado: ${e?.message ?? e}. ` +
        'Las notificaciones push quedan deshabilitadas, pero el backend sigue funcionando.',
      );
      this.firebase = null;
    }

  }

  private mapPlatform(p: PlatformDTO): PushPlatform {
    switch (p) {
      case 'android':
        return PushPlatform.ANDROID;
      case 'ios':
        return PushPlatform.IOS;
      case 'web':
        return PushPlatform.WEB;
      default:
        throw new Error(`Plataforma no soportada: ${p}`);
    }
  }

  /**
   * Guarda o actualiza un token de dispositivo para un usuario
   */
  async registerDeviceToken(params: {
    userId: number;
    token: string;
    platform: PlatformDTO; // lo que viene del front
  }) {
    if (!this.firebase) {
      this.logger.debug(
        `sendToUser() ignorado (Firebase no configurado). userId=${params.userId}`,
      );
      return;
    }

    const { userId, token } = params;
    const platform = this.mapPlatform(params.platform); // 👈 ahora es PushPlatform

    return this.prisma.devicePushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, disabled: false },
    });
  }

  /**
   * Desactiva un token (ej: si FCM devuelve error de "token inválido")
   */
  async disableToken(token: string) {
    await this.prisma.devicePushToken.updateMany({
      where: { token },
      data: { disabled: true },
    });
  }

  /**
   * Envía una notificación genérica a todos los dispositivos de un usuario
   */
  async sendToUser(params: {
    userId: number;
    title: string;
    body: string;
    kind: NotificationKind;
    data?: Record<string, string>;
  }) {
    const { userId, title, body, kind, data } = params;

    const tokens = await this.prisma.devicePushToken.findMany({
      where: {
        userId,
        disabled: false,
      },
    });

    if (!tokens.length) {
      this.logger.debug(`Usuario ${userId} sin tokens de push.`);
      return;
    }

    const messaging = this.firebase?.messaging();

    for (const t of tokens) {
      try {
        await messaging?.send({
          token: t.token,
          notification: {
            title,
            body,
          },
          data: {
            kind,
            ...(data ?? {}),
          },
          android: {
            notification: {
              channelId: 'default', // luego definís bien el canal
              priority: 'high',
            },
          },
        });
      } catch (err) {
        this.logger.warn(
          `Error enviando push a token=${t.token}: ${err?.message ?? err}`,
        );
        // si el token es inválido, lo marcás disabled
        if (String(err).includes('registration-token-not-registered')) {
          await this.disableToken(t.token);
        }
      }
    }
  }

  // Helpers específicos para tu dominio

  async notifyMovement(params: {
    userId: number;
    childName: string;
    amountCents: number;
    type: 'SALE' | 'TOPUP';
  }) {
    const { userId, childName, amountCents, type } = params;
    const amount = (amountCents / 100).toFixed(2);

    const title =
      type === 'SALE' ? 'Compra en kiosco' : 'Recarga de saldo realizada';

    const message =
      type === 'SALE'
        ? `${childName} gastó $ ${amount}.`
        : `Se cargó $ ${amount} a la cuenta de ${childName}.`;

    // 1) Guardar en historial
    await this.prisma.notification.create({
      data: {
        userId,
        kind: 'MOVEMENT',
        title,
        message,
        data: {
          childName,
          amount,
          type,
        },
      },
    });

    // 2) Enviar push
    return this.sendToUser({
      userId,
      title,
      body: message,
      kind: 'MOVEMENT',
      data: { childName, amount, type },
    });
  }

  async notifyLowBalance(params: {
    userId: number;
    childName: string;
    balanceCents: number;
  }) {
    const { userId, childName, balanceCents } = params;
    const balance = (balanceCents / 100).toFixed(2);

    return this.sendToUser({
      userId,
      title: 'Saldo bajo',
      body: `El saldo de ${childName} es $ ${balance}.`,
      kind: 'LOW_BALANCE',
      data: { childName, balance },
    });
  }

  async notifyLimitReached(params: {
    userId: number;
    childName: string;
    limitCents: number;
  }) {
    const { userId, childName, limitCents } = params;
    const limit = (limitCents / 100).toFixed(2);

    return this.sendToUser({
      userId,
      title: 'Límite diario alcanzado',
      body: `${childName} alcanzó el límite diario de $ ${limit}.`,
      kind: 'LIMIT_REACHED',
      data: { childName, limit },
    });
  }

  async listForUser(params: {
    userId: number;
    kind?: NotificationKind | undefined;
    onlyUnread?: boolean;
  }) {
    const { userId, kind, onlyUnread } = params;

    return this.prisma.notification.findMany({
      where: {
        userId,
        deleted: false,
        ...(kind ? { kind } : {}),
        ...(onlyUnread ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(userId: number, id: number) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async softDelete(userId: number, id: number) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { deleted: true },
    });
  }
}
