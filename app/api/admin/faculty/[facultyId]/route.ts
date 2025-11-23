import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { adminFacultyUpdateSchema } from "@/lib/validation/admin";
export { dynamic, revalidate, fetchCache } from "@/lib/route-config";

export async function GET(request: Request, { params }: { params: { facultyId: string } }) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { facultyId } = params;
    if (!facultyId) {
      return NextResponse.json({ message: "Faculty id is required" }, { status: 400 });
    }

    const faculty = await prisma.user.findUnique({
      where: { id: facultyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeId: true,
        program: true,
        phone: true,
        address: true,
        bio: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: true,
      },
    });

    if (!faculty || faculty.role !== "faculty") {
      return NextResponse.json({ message: "Faculty member not found" }, { status: 404 });
    }

    return NextResponse.json({
      faculty: {
        ...faculty,
        createdAt: faculty.createdAt.toISOString(),
        updatedAt: faculty.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin fetch faculty error", error);
    return NextResponse.json({ message: "Unable to load faculty" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { facultyId: string } }) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { facultyId } = params;
    if (!facultyId) {
      return NextResponse.json({ message: "Faculty id is required" }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = adminFacultyUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    const target = await prisma.user.findUnique({ where: { id: facultyId } });
    if (!target || target.role !== "faculty") {
      return NextResponse.json({ message: "Faculty member not found" }, { status: 404 });
    }

    if (data.email && data.email !== target.email) {
      const emailConflict = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: facultyId } },
        select: { id: true },
      });
      if (emailConflict) {
        return NextResponse.json({ message: "Email already in use" }, { status: 409 });
      }
    }

    if (data.employeeId && data.employeeId !== target.employeeId) {
      const idConflict = await prisma.user.findFirst({
        where: {
          OR: [{ employeeId: data.employeeId }, { studentId: data.employeeId }],
          NOT: { id: facultyId },
        },
        select: { id: true },
      });
      if (idConflict) {
        return NextResponse.json({ message: "Employee ID already in use" }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.email) updateData.email = data.email;
    if (data.employeeId) {
      updateData.employeeId = data.employeeId;
      updateData.studentId = data.employeeId;
    }
    if (data.department) updateData.program = data.department;
    if (data.phone !== undefined) updateData.phone = data.phone ?? null;
    if (data.address !== undefined) updateData.address = data.address ?? null;
    if (data.bio !== undefined) updateData.bio = data.bio ?? null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No valid fields provided" }, { status: 400 });
    }

    const faculty = await prisma.user.update({
      where: { id: facultyId },
      data: updateData,
    });

    return NextResponse.json({
      message: "Faculty updated",
      faculty: {
        id: faculty.id,
        firstName: faculty.firstName,
        lastName: faculty.lastName,
        email: faculty.email,
        employeeId: faculty.employeeId ?? null,
        program: faculty.program,
        phone: faculty.phone,
        address: faculty.address,
        bio: faculty.bio,
        isActive: faculty.isActive,
        updatedAt: faculty.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin update faculty error", error);
    return NextResponse.json({ message: "Unable to update faculty" }, { status: 500 });
  }
}
