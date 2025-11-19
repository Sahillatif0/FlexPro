import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, getSessionFromToken } from '@/lib/auth';

export async function GET() {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const user = await getSessionFromToken(token);

    if (!user) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Session error', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
