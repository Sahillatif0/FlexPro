import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { adminStudentRegistrationSchema } from "@/lib/validation/admin";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = adminStudentRegistrationSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { studentId: data.studentId }],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: "A user with the provided email or student ID already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const student = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        studentId: data.studentId,
        role: "student",
        program: data.program,
        semester: data.semester,
        section: data.section ?? "A",
        cgpa: data.cgpa,
        phone: data.phone ?? null,
        address: data.address ?? null,
        bio: data.bio ?? null,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Student registered",
        student: {
          id: student.id,
          fullName: `${student.firstName} ${student.lastName}`,
          email: student.email,
          studentId: student.studentId,
          program: student.program,
          semester: student.semester,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin register student error", error);
    return NextResponse.json({ message: "Unable to register student" }, { status: 500 });
  }
}
