import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";

async function requireAdminSession() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const sessionUser = await getSessionFromToken(token);
  if (!sessionUser) {
    return { status: 401 as const, message: "Not authenticated" };
  }
  if (sessionUser.role !== "admin") {
    return { status: 403 as const, message: "Forbidden" };
  }
  return { status: 200 as const };
}

export async function GET(request: Request) {
  try {
    const session = await requireAdminSession();
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100;

    const [courseRecords, facultyMembers] = await Promise.all([
      prisma.course.findMany({
        select: {
          id: true,
          code: true,
          title: true,
          department: true,
          creditHours: true,
          semester: true,
          maxCapacity: true,
          isActive: true,
          createdAt: true,
          instructorId: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.user.findMany({
        where: { role: "faculty", isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
    ]);

    const facultyLookup = facultyMembers.reduce<Record<string, typeof facultyMembers[number]>>(
      (acc, member) => {
        acc[member.id] = member;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      courses: courseRecords.map((course) => {
        const instructor = course.instructorId ? facultyLookup[course.instructorId] : undefined;
        return {
          id: course.id,
          code: course.code,
          title: course.title,
          department: course.department,
          creditHours: course.creditHours,
          semester: course.semester,
          maxCapacity: course.maxCapacity,
          isActive: course.isActive,
          createdAt: course.createdAt.toISOString(),
          instructor: instructor
            ? {
                id: instructor.id,
                firstName: instructor.firstName,
                lastName: instructor.lastName,
                employeeId: instructor.employeeId ?? null,
              }
            : null,
        };
      }),
      instructors: facultyMembers.map((instructor) => ({
        id: instructor.id,
        fullName: `${instructor.firstName} ${instructor.lastName}`,
        employeeId: instructor.employeeId ?? null,
      })),
    });
  } catch (error) {
    console.error("Admin courses fetch error", error);
    return NextResponse.json({ message: "Failed to load courses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const {
      code,
      title,
      description,
      creditHours,
      department,
      semester,
      prerequisite,
      maxCapacity,
      instructorId,
    } = body as {
      code?: string;
      title?: string;
      description?: string | null;
      creditHours?: number;
      department?: string;
      semester?: number;
      prerequisite?: string | null;
      maxCapacity?: number;
      instructorId?: string | null;
    };

    if (!code || !title || !creditHours || !department || !semester) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const existingCourse = await prisma.course.findUnique({ where: { code: normalizedCode } });
    if (existingCourse) {
      return NextResponse.json({ message: "Course code already exists" }, { status: 409 });
    }

    const course = (await prisma.course.create({
      data: {
        code: normalizedCode,
        title: title.trim(),
        description: description?.trim() ?? null,
        creditHours,
        department,
        semester,
        prerequisite: prerequisite?.trim() ?? null,
        maxCapacity: maxCapacity ?? 40,
        instructorId: instructorId ?? null,
      } as any,
    })) as any;

    const instructor = course.instructorId
      ? ((await prisma.user.findUnique({ where: { id: course.instructorId } })) as any)
      : null;

    return NextResponse.json({
      message: "Course created",
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        department: course.department,
        creditHours: course.creditHours,
        semester: course.semester,
        maxCapacity: course.maxCapacity,
        isActive: course.isActive,
        createdAt: course.createdAt.toISOString(),
        instructor: instructor
          ? {
              id: instructor.id,
              firstName: instructor.firstName,
              lastName: instructor.lastName,
              employeeId: instructor.employeeId ?? null,
            }
          : null,
        },
      });
  } catch (error) {
    console.error("Admin create course error", error);
    return NextResponse.json({ message: "Unable to create course" }, { status: 500 });
  }
}
