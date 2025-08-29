import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  studentId: string;
  role: string;
  program: string;
  semester: number;
  cgpa: number;
  bio?: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

export async function validateCredentials(email: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: user.studentId,
      role: user.role,
      program: user.program,
      semester: user.semester,
      cgpa: user.cgpa,
      bio: user.bio || undefined,
      phone: user.phone || undefined,
      address: user.address || undefined,
      avatar: user.avatar || undefined,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function getSession(): Promise<User | null> {
  // Placeholder for session management
  // In a real app, this would validate JWT tokens or session cookies
  return null;
}