import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPublicUser } from '@/lib/auth';

const ALLOWED_FIELDS = new Set(['firstName', 'lastName', 'bio', 'phone', 'address']);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: toPublicUser(user) }, { status: 200 });
  } catch (error) {
    console.error('Profile GET error', error);
    return NextResponse.json(
      { message: 'Failed to load profile information' },
      { status: 500 }
    );
  }
}

interface ProfileUpdatePayload {
  userId?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  phone?: string;
  address?: string;
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as ProfileUpdatePayload;
    const { userId, ...rest } = body;

    if (!userId) {
      return NextResponse.json(
        { message: 'userId is required' },
        { status: 400 }
      );
    }

    const data: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(rest)) {
      if (!ALLOWED_FIELDS.has(key)) continue;
      data[key] = value ?? null;
    }

    if (!Object.keys(data).length) {
      return NextResponse.json(
        { message: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json(
      { message: 'Profile updated successfully', user: toPublicUser(updatedUser) },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Profile PATCH error', error);

    if (error?.code === 'P2025') {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
