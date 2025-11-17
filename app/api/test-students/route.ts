import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerStudentSchema } from '@/lib/validation/student';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerStudentSchema.safeParse(payload);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { message: 'Validation failed', errors: fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const exists = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { studentId: data.studentId }],
      },
    });

    if (exists) {
      return NextResponse.json(
        { message: 'A user with that email or student ID already exists.' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        studentId: data.studentId,
        role: 'student',
        program: data.program,
        semester: data.semester,
        cgpa: data.cgpa,
        phone: data.phone,
        address: data.address,
        bio: data.bio,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Student registered successfully',
        user: {
          id: user.id,
          email: user.email,
          studentId: user.studentId,
          fullName: `${user.firstName} ${user.lastName}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to register student', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
