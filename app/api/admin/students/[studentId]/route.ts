import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { adminStudentUpdateSchema } from "@/lib/validation/admin";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type StudentParams = { studentId: string };

function resolveParams<T>(params: T | Promise<T>): Promise<T> {
  return Promise.resolve(params);
}

export async function GET(
  request: Request,
  context: { params: StudentParams | Promise<StudentParams> }
) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { studentId } = await resolveParams(context.params);
    const slug = decodeURIComponent(studentId ?? "").trim();
    if (!slug) {
      return NextResponse.json({ message: "Student id is required" }, { status: 400 });
    }

    const student = await prisma.user.findFirst({
      where: {
        role: "student",
        OR: [{ id: slug }, { studentId: slug }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        studentId: true,
        program: true,
        semester: true,
        section: true,
        cgpa: true,
        role: true,
        phone: true,
        address: true,
        bio: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      student: {
        ...student,
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin fetch student error", error);
    return NextResponse.json({ message: "Unable to load student" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: StudentParams | Promise<StudentParams> }
) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { studentId } = await resolveParams(context.params);
    const slug = decodeURIComponent(studentId ?? "").trim();
    if (!slug) {
      return NextResponse.json({ message: "Student id is required" }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = adminStudentUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    const target = await prisma.user.findFirst({
      where: {
        role: "student",
        OR: [{ id: slug }, { studentId: slug }],
      },
    });
    if (!target) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    const targetId = target.id;

    if (data.email && data.email !== target.email) {
      const emailConflict = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: targetId } },
        select: { id: true },
      });
      if (emailConflict) {
        return NextResponse.json({ message: "Email already in use" }, { status: 409 });
      }
    }

    if (data.studentId && data.studentId !== target.studentId) {
      const idConflict = await prisma.user.findFirst({
        where: { studentId: data.studentId, NOT: { id: targetId } },
        select: { id: true },
      });
      if (idConflict) {
        return NextResponse.json({ message: "Student ID already in use" }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.email) updateData.email = data.email;
    if (data.studentId) updateData.studentId = data.studentId;
    if (data.program) updateData.program = data.program;
    if (data.semester !== undefined) updateData.semester = data.semester;
    if (data.section) updateData.section = data.section;
    if (data.cgpa !== undefined) updateData.cgpa = data.cgpa;
    if (data.phone !== undefined) updateData.phone = data.phone ?? null;
    if (data.address !== undefined) updateData.address = data.address ?? null;
    if (data.bio !== undefined) updateData.bio = data.bio ?? null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No valid fields provided" }, { status: 400 });
    }

    const student = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
    });

    return NextResponse.json({
      message: "Student updated",
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        studentId: student.studentId,
        program: student.program,
        semester: student.semester,
        section: student.section,
        cgpa: student.cgpa,
        phone: student.phone,
        address: student.address,
        bio: student.bio,
        isActive: student.isActive,
        updatedAt: student.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin update student error", error);
    return NextResponse.json({ message: "Unable to update student" }, { status: 500 });
  }
}
