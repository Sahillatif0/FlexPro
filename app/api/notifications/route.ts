import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function ensurePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 100);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const take = ensurePositiveInt(searchParams.get('take'), 25);

    if (!userId) {
      return NextResponse.json(
        { message: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId }, { isGlobal: true }],
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return NextResponse.json({
      notifications: notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Notifications GET error', error);
    return NextResponse.json(
      { message: 'Failed to load notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const { userId, notificationIds } = body as {
      userId?: string;
      notificationIds?: string[];
    };

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { message: 'notificationIds must be a non-empty array' },
        { status: 400 }
      );
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        OR: [{ userId }, { isGlobal: true }],
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Notifications PATCH error', error);
    return NextResponse.json(
      { message: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
