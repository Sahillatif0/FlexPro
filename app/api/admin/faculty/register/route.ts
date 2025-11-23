import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { adminFacultyRegistrationSchema } from "@/lib/validation/admin";
import { ROUTE_DYNAMIC, ROUTE_REVALIDATE, ROUTE_FETCH_CACHE } from "@/lib/route-config";

export const dynamic = ROUTE_DYNAMIC;
export const revalidate = ROUTE_REVALIDATE;
export const fetchCache = ROUTE_FETCH_CACHE;

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

    const parsed = adminFacultyRegistrationSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { employeeId: data.employeeId }, { studentId: data.employeeId }],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: "A faculty member with the provided email or employee ID already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const faculty = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        studentId: data.employeeId,
        employeeId: data.employeeId,
        role: "faculty",
        program: data.department,
        semester: 0,
        cgpa: 0,
        phone: data.phone ?? null,
        address: data.address ?? null,
        bio: data.bio ?? null,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Faculty member registered",
        faculty: {
          id: faculty.id,
          fullName: `${faculty.firstName} ${faculty.lastName}`,
          email: faculty.email,
          employeeId: faculty.employeeId,
          department: faculty.program,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin register faculty error", error);
    return NextResponse.json({ message: "Unable to register faculty" }, { status: 500 });
  }
}
