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
          sections: {
            select: {
              id: true,
              name: true,
              instructor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeId: true,
                },
              },
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      } as any),
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

    return NextResponse.json({
      courses: (courseRecords as any[]).map((course: any) => {
        const sections = Array.isArray(course.sections) ? (course.sections as any[]) : [];
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
          sections: sections.map((section: any) => ({
            id: section.id,
            name: section.name,
            instructor: section.instructor
              ? {
                  id: section.instructor.id,
                  firstName: section.instructor.firstName,
                  lastName: section.instructor.lastName,
                  employeeId: section.instructor.employeeId ?? null,
                }
              : null,
          })),
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
      sections,
    } = body as {
      code?: string;
      title?: string;
      description?: string | null;
      creditHours?: number;
      department?: string;
      semester?: number;
      prerequisite?: string | null;
      maxCapacity?: number;
      sections?: string[];
    };

    if (!code || !title || !creditHours || !department || !semester) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const existingCourse = await prisma.course.findUnique({ where: { code: normalizedCode } });
    if (existingCourse) {
      return NextResponse.json({ message: "Course code already exists" }, { status: 409 });
    }

    const course = await prisma.course.create({
      data: {
        code: normalizedCode,
        title: title.trim(),
        description: description?.trim() ?? null,
        creditHours,
        department,
        semester,
        prerequisite: prerequisite?.trim() ?? null,
        maxCapacity: maxCapacity ?? 40,
      },
    });

    const uniqueSections = Array.isArray(sections)
      ? Array.from(
          new Set(
            sections
              .map((value) => (typeof value === "string" ? value.trim() : ""))
              .filter((value) => value.length > 0)
          )
        )
      : [];

    if (uniqueSections.length) {
      await Promise.all(
        uniqueSections.map((sectionName) =>
          (prisma as any).courseSection.create({
            data: {
              courseId: course.id,
              name: sectionName,
            },
          })
        )
      );
    }

    const sectionsForCourse = await (prisma as any).courseSection.findMany({
      where: { courseId: course.id },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

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
        sections: (sectionsForCourse as any[]).map((section: any) => ({
          id: section.id,
          name: section.name,
          instructor: section.instructor
            ? {
                id: section.instructor.id,
                firstName: section.instructor.firstName,
                lastName: section.instructor.lastName,
                employeeId: section.instructor.employeeId ?? null,
              }
            : null,
        })),
        },
      });
  } catch (error) {
    console.error("Admin create course error", error);
    return NextResponse.json({ message: "Unable to create course" }, { status: 500 });
  }
}
