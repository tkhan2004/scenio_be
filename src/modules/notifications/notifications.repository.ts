import { NotificationCtaType, NotificationType, Prisma } from '@prisma/client';
import prisma from '../../config/database';

type DbClient = Prisma.TransactionClient | typeof prisma;

export type NotificationCreateInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  ctaType?: NotificationCtaType | null;
  metadata?: Prisma.InputJsonValue | null;
};

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  ctaType: true,
  metadata: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NotificationSelect;

export async function findNotificationsPage(
  userId: string,
  args: {
    skip: number;
    take: number;
    unreadOnly?: boolean;
  },
  db: DbClient = prisma,
) {
  return db.notification.findMany({
    where: {
      userId,
      ...(args.unreadOnly ? { isRead: false } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    skip: args.skip,
    take: args.take,
    select: notificationSelect,
  });
}

export async function countNotifications(
  userId: string,
  args: { unreadOnly?: boolean } = {},
  db: DbClient = prisma,
) {
  return db.notification.count({
    where: {
      userId,
      ...(args.unreadOnly ? { isRead: false } : {}),
    },
  });
}

export async function countUnreadNotifications(userId: string, db: DbClient = prisma) {
  return db.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

export async function findOwnedNotificationById(userId: string, id: string, db: DbClient = prisma) {
  return db.notification.findFirst({
    where: {
      id,
      userId,
    },
    select: notificationSelect,
  });
}

export async function updateNotificationById(
  id: string,
  data: Prisma.NotificationUpdateInput,
  db: DbClient = prisma,
) {
  return db.notification.update({
    where: { id },
    data,
    select: notificationSelect,
  });
}

export async function updateManyNotificationsForUser(
  userId: string,
  where: Prisma.NotificationWhereInput,
  data: Prisma.NotificationUpdateManyMutationInput,
  db: DbClient = prisma,
) {
  return db.notification.updateMany({
    where: {
      userId,
      ...where,
    },
    data,
  });
}

export async function createNotification(data: NotificationCreateInput, db: DbClient = prisma) {
  return db.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      ctaType: data.ctaType ?? null,
      metadata: data.metadata ?? undefined,
    },
    select: notificationSelect,
  });
}

export async function createNotifications(data: NotificationCreateInput[], db: DbClient = prisma) {
  if (data.length === 0) return { count: 0 };

  return db.notification.createMany({
    data: data.map((item) => ({
      userId: item.userId,
      type: item.type,
      title: item.title,
      message: item.message,
      ctaType: item.ctaType ?? null,
      metadata: item.metadata ?? undefined,
    })),
  });
}
