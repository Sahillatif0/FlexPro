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

    const facultyMembers = (await prisma.user.findMany({
      where: { role: "faculty" },
      orderBy: { createdAt: "desc" },
      take: limit,
    })) as any[];

    const facultyIds = facultyMembers.map((member) => member.id);

    if (!facultyIds.length) {
      return NextResponse.json({ faculty: [] });
    }

    const courseAssignments = (await prisma.course.findMany({
      where: { instructorId: { in: facultyIds } } as any,
      select: { instructorId: true } as any,
    })) as any[];

    const countsLookup = courseAssignments.reduce<Record<string, number>>((acc, course) => {
      if (course.instructorId) {
        acc[course.instructorId] = (acc[course.instructorId] ?? 0) + 1;
      }
      return acc;
    }, {});

    return NextResponse.json({
      faculty: facultyMembers.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        employeeId: member.employeeId ?? null,
        department: member.program ?? null,
        totalCourses: countsLookup[member.id] ?? 0,
        isActive: member.isActive,
        joinedAt: member.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Admin faculty fetch error", error);
    return NextResponse.json({ message: "Failed to load faculty" }, { status: 500 });
  }
}
