import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ROUTE_DYNAMIC, ROUTE_REVALIDATE, ROUTE_FETCH_CACHE } from "@/lib/route-config";

export const dynamic = ROUTE_DYNAMIC;
export const revalidate = ROUTE_REVALIDATE;
export const fetchCache = ROUTE_FETCH_CACHE;

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
    const sessionUser = await getSessionFromRequest(request);

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
      where: {
        id: courseId,
        sections: {
          some: {
            instructorId: sessionUser.id,
          },
        },
      },
      include: {
        sections: {
          where: { instructorId: sessionUser.id },
        },
      },
    } as any);

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const sectionNameSet = new Set(
      (Array.isArray((course as any).sections) ? ((course as any).sections as any[]) : [])
        .map((section: any) => (section.name as string).trim().toLowerCase())
        .filter((name: string) => name.length > 0)
    );

    const records = await prisma.transcript.findMany({
      where: {
        courseId,
        termId,
        status: "final",
      },
      include: {
        user: true,
      },
    });

    const filtered = (records as any[])
      .filter((record: any) => {
        const normalizedStudentSection = (record.user?.section ?? "").trim().toLowerCase();
        if (!normalizedStudentSection) {
          return true;
        }
        return sectionNameSet.has(normalizedStudentSection);
      })
      .map((record: any) => ({
        userId: record.userId,
        grade: record.grade,
        gradePoints: record.gradePoints,
      }));

    return NextResponse.json({ records: filtered });
  } catch (error) {
    console.error("Faculty marks fetch failed", error);
    return NextResponse.json({ message: "Failed to load gradebook" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionFromRequest(request);

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
      where: {
        id: courseId,
        sections: {
          some: {
            instructorId: sessionUser.id,
          },
        },
      },
      include: {
        sections: {
          where: { instructorId: sessionUser.id },
        },
      },
    } as any);

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const sectionNameSet = new Set(
      (Array.isArray((course as any).sections) ? ((course as any).sections as any[]) : [])
        .map((section: any) => (section.name as string).trim().toLowerCase())
        .filter((name: string) => name.length > 0)
    );

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
      include: {
        user: true,
      },
    });

    const filteredValidStudents = new Set(
      (enrollments as any[])
        .filter((enrollment: any) => {
          const normalizedStudentSection = (enrollment.user?.section ?? "").trim().toLowerCase();
          if (!normalizedStudentSection) {
            return true;
          }
          return sectionNameSet.has(normalizedStudentSection);
        })
        .map((enrollment: any) => enrollment.userId)
    );

    const tasks = entries
      .filter((entry: any): entry is { userId: string; grade: string; gradePoints?: number | null } =>
        Boolean(entry?.userId) && typeof entry?.grade === "string" && entry.grade.length > 0
      )
      .filter((entry: any) => filteredValidStudents.has(entry.userId))
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
