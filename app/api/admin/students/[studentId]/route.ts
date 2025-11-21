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

export async function PATCH(request: Request, { params }: { params: { studentId: string } }) {
  try {
    const session = await requireAdminSession();
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { studentId } = params;
    if (!studentId) {
      return NextResponse.json({ message: "Student id is required" }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof payload.isActive === "boolean") {
      data.isActive = payload.isActive;
    }
    if (typeof payload.program === "string") {
      data.program = payload.program;
    }
    if (typeof payload.semester === "number" && payload.semester > 0) {
      data.semester = payload.semester;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "No valid fields provided" }, { status: 400 });
    }

    const student = await prisma.user.update({
      where: { id: studentId },
      data: data as any,
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
        cgpa: student.cgpa,
        isActive: student.isActive,
        createdAt: student.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin update student error", error);
    return NextResponse.json({ message: "Unable to update student" }, { status: 500 });
  }
}
