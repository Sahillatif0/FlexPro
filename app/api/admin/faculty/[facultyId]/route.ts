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

export async function PATCH(request: Request, { params }: { params: { facultyId: string } }) {
  try {
    const session = await requireAdminSession();
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

    const data: Record<string, unknown> = {};
    if (typeof payload.isActive === "boolean") {
      data.isActive = payload.isActive;
    }
    if (typeof payload.program === "string") {
      data.program = payload.program;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "No valid fields provided" }, { status: 400 });
    }

    const faculty = (await prisma.user.update({
      where: { id: facultyId },
      data: data as any,
    })) as any;

    return NextResponse.json({
      message: "Faculty updated",
      faculty: {
        id: faculty.id,
        firstName: faculty.firstName,
        lastName: faculty.lastName,
        email: faculty.email,
        employeeId: faculty.employeeId ?? null,
        program: faculty.program,
        isActive: faculty.isActive,
        createdAt: faculty.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin update faculty error", error);
    return NextResponse.json({ message: "Unable to update faculty" }, { status: 500 });
  }
}
