import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";

const DEFAULT_GRADE_POINTS: Record<string, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.67,
  "B+": 3.33,
  B: 3.0,
  "B-": 2.67,
  "C+": 2.33,
  C: 2.0,
  "C-": 1.67,
  "D+": 1.33,
  D: 1.0,
  F: 0,
};

export async function GET(request: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const sessionUser = await getSessionFromToken(token);

    if (!sessionUser) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (sessionUser.role !== "faculty") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const termId = searchParams.get("termId");

    if (!courseId || !termId) {
      return NextResponse.json({ message: "courseId and termId are required" }, { status: 400 });
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, instructorId: sessionUser.id } as any,
    });

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const records = await prisma.transcript.findMany({
      where: {
        courseId,
        termId,
        status: "final",
      },
      select: {
        userId: true,
        grade: true,
        gradePoints: true,
      },
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Faculty marks fetch failed", error);
    return NextResponse.json({ message: "Failed to load gradebook" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const sessionUser = await getSessionFromToken(token);

    if (!sessionUser) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (sessionUser.role !== "faculty") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const courseId = body?.courseId as string | undefined;
    const termId = body?.termId as string | undefined;
    const entries = Array.isArray(body?.entries) ? body.entries : [];

    if (!courseId || !termId) {
      return NextResponse.json({ message: "courseId and termId are required" }, { status: 400 });
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, instructorId: sessionUser.id } as any,
    });

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const studentIds = entries
      .filter((entry: any): entry is { userId: string; grade?: string; gradePoints?: number | null } =>
        Boolean(entry?.userId)
      )
      .map((entry: any) => entry.userId);

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        termId,
        userId: { in: studentIds },
      },
      select: {
        userId: true,
      },
    });

    const validStudents = new Set(enrollments.map((enrollment) => enrollment.userId));

    const tasks = entries
      .filter((entry: any): entry is { userId: string; grade: string; gradePoints?: number | null } =>
        Boolean(entry?.userId) && typeof entry?.grade === "string" && entry.grade.length > 0
      )
      .filter((entry: any) => validStudents.has(entry.userId))
      .map((entry: any) => {
        const gradePoints =
          typeof entry.gradePoints === "number" && !Number.isNaN(entry.gradePoints)
            ? entry.gradePoints
            : DEFAULT_GRADE_POINTS[entry.grade] ?? null;

        return prisma.transcript.upsert({
          where: {
            userId_courseId_termId_status: {
              userId: entry.userId,
              courseId,
              termId,
              status: "final",
            },
          },
          update: {
            grade: entry.grade,
            gradePoints: gradePoints ?? DEFAULT_GRADE_POINTS[entry.grade] ?? 0,
          },
          create: {
            userId: entry.userId,
            courseId,
            termId,
            grade: entry.grade,
            gradePoints: gradePoints ?? DEFAULT_GRADE_POINTS[entry.grade] ?? 0,
            status: "final",
          },
        });
      });

    await Promise.all(tasks);

    return NextResponse.json({ message: "Grades saved" });
  } catch (error) {
    console.error("Faculty marks save failed", error);
    return NextResponse.json({ message: "Failed to save grades" }, { status: 500 });
  }
}
