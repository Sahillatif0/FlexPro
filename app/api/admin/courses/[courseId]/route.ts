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

function mapCourse(course: any, instructor: any | null) {
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
}

export async function PATCH(request: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await requireAdminSession();
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { courseId } = params;
    if (!courseId) {
      return NextResponse.json({ message: "Course id is required" }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (typeof payload.title === "string") {
      data.title = payload.title.trim();
    }
    if (typeof payload.description === "string") {
      data.description = payload.description.trim();
    }
    if (typeof payload.creditHours === "number" && payload.creditHours > 0) {
      data.creditHours = payload.creditHours;
    }
    if (typeof payload.department === "string") {
      data.department = payload.department;
    }
    if (typeof payload.semester === "number" && payload.semester > 0) {
      data.semester = payload.semester;
    }
    if (typeof payload.prerequisite === "string") {
      data.prerequisite = payload.prerequisite.trim() || null;
    }
    if (typeof payload.maxCapacity === "number" && payload.maxCapacity > 0) {
      data.maxCapacity = payload.maxCapacity;
    }
    if (typeof payload.isActive === "boolean") {
      data.isActive = payload.isActive;
    }
    if ("instructorId" in payload) {
      data.instructorId = payload.instructorId || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "No valid fields provided" }, { status: 400 });
    }

    const course = (await prisma.course.update({
      where: { id: courseId },
      data: data as any,
    })) as any;

    const instructor = course.instructorId
      ? ((await prisma.user.findUnique({ where: { id: course.instructorId } })) as any)
      : null;

    return NextResponse.json({ message: "Course updated", course: mapCourse(course, instructor) });
  } catch (error) {
    console.error("Admin update course error", error);
    return NextResponse.json({ message: "Unable to update course" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await requireAdminSession();
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { courseId } = params;
    if (!courseId) {
      return NextResponse.json({ message: "Course id is required" }, { status: 400 });
    }

    await prisma.course.delete({ where: { id: courseId } });
    return NextResponse.json({ message: "Course deleted" });
  } catch (error) {
    console.error("Admin delete course error", error);
    return NextResponse.json({ message: "Unable to delete course" }, { status: 500 });
  }
}
