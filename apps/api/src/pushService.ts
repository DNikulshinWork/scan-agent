import webpush from 'web-push';
import { prisma } from '@scan-agent/database';
import dotenv from 'dotenv';

dotenv.config();

// Стандартная валидная пара VAPID-ключей (prime256v1 / RFC 8291), если не задана через переменные окружения
const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BF8IOq6aG4xHM4E-LXLg3UEPF43TsXCO0quFGNjKk6c-aHmLLx4CsfP8-pvnxNwBBnnOdDoW1A2AhuwpKxMlVtg';

const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'PisSxgZ7StRxYFFjhVFww6o8e324IUngqpVQigf28uw';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:d.nikulshin.dev@gmail.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, DEFAULT_VAPID_PUBLIC_KEY, DEFAULT_VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('[WebPush] Не удалось настроить VAPID details:', err);
}

export function getVapidPublicKey(): string {
  return DEFAULT_VAPID_PUBLIC_KEY;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    vacancyId?: string;
    [key: string]: any;
  };
}

/**
 * Сохранить или обновить Push-подписку браузера в PostgreSQL (Neon)
 */
export async function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: sub.userAgent || null,
      updatedAt: new Date(),
    },
    create: {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: sub.userAgent || null,
    },
  });
}

/**
 * Удалить Push-подписку при отписке пользователя
 */
export async function removePushSubscription(endpoint: string) {
  return prisma.pushSubscription.deleteMany({
    where: { endpoint },
  });
}

/**
 * Отправить Web Push уведомление всем активным подписчикам
 */
export async function broadcastPushNotification(payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  const stringifiedPayload = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  const promises = subscriptions.map(async (sub: any) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, stringifiedPayload);
      sent++;
    } catch (err: any) {
      failed++;
      // Если клиент отписался или подписка устарела (HTTP 404/410 Gone), удаляем из базы
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
      }
    }
  });

  await Promise.all(promises);
  return { sent, failed, total: subscriptions.length };
}

/**
 * Отправить тестовое Web Push уведомление
 */
export async function sendTestPushNotification(endpoint?: string) {
  const payload: PushPayload = {
    title: '🔔 ScanAgent: Настоящий Web Push!',
    body: 'Уведомление доставлено через серверный Web Push API даже при закрытой вкладке браузера.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {
      url: './',
    },
  };

  if (endpoint) {
    const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (!sub) {
      throw new Error('Подписка не найдена в базе данных');
    }
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true, sent: 1 };
  }

  return broadcastPushNotification(payload);
}
