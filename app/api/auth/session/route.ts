import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, getSessionFromToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    console.log('Session API: Token from cookie:', token ? 'Found' : 'Missing');

    const user = await getSessionFromToken(token);
    console.log('Session API: User from token:', user ? user.id : 'Null');

    if (!user) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Session error', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
