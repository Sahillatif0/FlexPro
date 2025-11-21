import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from './prisma';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  studentId: string;
  employeeId?: string | null;
  role: string;
  program: string;
  semester: number;
  cgpa: number;
  bio?: string | null;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
}

export const AUTH_COOKIE_NAME = 'flexpro_token';
export const AUTH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }
  return secret;
}

function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;
  return buffer.toString('base64url');
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

function toPublicUser(user: any): User {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    studentId: user.studentId,
    employeeId: user.employeeId ?? null,
    role: user.role,
    program: user.program,
    semester: user.semester,
    cgpa: user.cgpa,
    bio: user.bio ?? null,
    phone: user.phone ?? null,
    address: user.address ?? null,
    avatar: user.avatar ?? null,
  };
}

function verifyAuthToken(token: string): TokenPayload | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      return null;
    }

    const secret = getAuthSecret();
    const data = `${header}.${payload}`;
    const expectedSignature = createHmac('sha256', secret).update(data).digest();
    const providedSignature = base64UrlDecode(signature);

    if (expectedSignature.length !== providedSignature.length) {
      return null;
    }

    const expectedBytes = new Uint8Array(expectedSignature);
    const providedBytes = new Uint8Array(providedSignature);

    if (!timingSafeEqual(expectedBytes, providedBytes)) {
      return null;
    }

    const payloadJson = JSON.parse(base64UrlDecode(payload).toString()) as TokenPayload;

    if (typeof payloadJson.exp !== 'number' || payloadJson.exp * 1000 < Date.now()) {
      return null;
    }

    return payloadJson;
  } catch (error) {
    console.error('JWT verification failed', error);
    return null;
  }
}

export function signAuthToken(userId: string, ttlSeconds: number = AUTH_TOKEN_MAX_AGE): string {
  const secret = getAuthSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: userId,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };

  const headerSegment = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerSegment}.${payloadSegment}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');

  return `${data}.${signature}`;
}

export async function validateCredentials(email: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive || !user.password) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    return toPublicUser(user);
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function getSessionFromToken(token?: string | null): Promise<User | null> {
  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return toPublicUser(user);
  } catch (error) {
    console.error('Session lookup failed', error);
    return null;
  }
}

export { toPublicUser };