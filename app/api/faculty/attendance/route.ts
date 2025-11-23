import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
export { dynamic, revalidate, fetchCache } from "@/lib/route-config";

const ALLOWED_STATUSES = new Set(["present", "absent", "late"]);

function parseISODate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

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
    const dateParam = searchParams.get("date");
    const sectionId = searchParams.get("sectionId");

    if (!courseId || !termId) {
      return NextResponse.json({ message: "courseId and termId are required" }, { status: 400 });
    }

    const date = parseISODate(dateParam ?? new Date().toISOString().slice(0, 10));
    if (!date) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 });
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

    const assignedSections = Array.isArray((course as any).sections)
      ? ((course as any).sections as any[])
      : [];
    const sectionById = new Map<string, any>(assignedSections.map((section) => [section.id, section]));

    if (sectionId && sectionId !== "__unassigned__" && !sectionById.has(sectionId)) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    const records = await prisma.attendance.findMany({
      where: {
        courseId,
        termId,
        date: {
          gte: new Date(date.toISOString().split("T")[0] + "T00:00:00.000Z"),
          lte: new Date(date.toISOString().split("T")[0] + "T23:59:59.999Z"),
        },
      },
      select: {
        userId: true,
        status: true,
      },
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Faculty attendance fetch failed", error);
    return NextResponse.json({ message: "Failed to load attendance" }, { status: 500 });
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
    const sectionId = body?.sectionId as string | undefined;
    const dateValue = typeof body?.date === "string" ? body.date : undefined;
    const entries = Array.isArray(body?.entries) ? body.entries : [];

    if (!courseId || !termId || !dateValue) {
      return NextResponse.json({ message: "courseId, termId, and date are required" }, { status: 400 });
    }

    const date = parseISODate(dateValue);
    if (!date) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 });
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

    const courseSections = Array.isArray((course as any).sections)
      ? ((course as any).sections as any[])
      : [];

    const normalizedSections = courseSections.map((section: any) => ({
      id: section.id as string,
      name: section.name as string,
      normalizedName: (section.name as string).trim().toLowerCase(),
    }));

    const sectionLookup = new Map<string, { id: string; name: string; normalizedName: string }>(
      normalizedSections.map((section) => [section.id, section])
    );
    const sectionNameSet = new Set<string>(normalizedSections.map((section) => section.normalizedName));

    const targetSection = sectionId && sectionId !== "__unassigned__" ? sectionLookup.get(sectionId) : undefined;

    if (sectionId && sectionId !== "__unassigned__" && !targetSection) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    const studentIds = entries
      .filter((entry: any): entry is { userId: string; status: string } =>
        Boolean(entry?.userId) && typeof entry?.status === "string" && ALLOWED_STATUSES.has(entry.status)
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

    const validStudentIds = new Set(
      (enrollments as any[])
        .filter((enrollment: any) => {
          const normalizedStudentSection = (enrollment.user.section ?? "").trim().toLowerCase();

          if (!sectionId) {
            if (!normalizedStudentSection) {
              return true;
            }
            return sectionNameSet.has(normalizedStudentSection);
          }

          if (sectionId === "__unassigned__") {
            return !normalizedStudentSection;
          }

          if (!targetSection) {
            return false;
          }

          return normalizedStudentSection === targetSection.normalizedName;
        })
        .map((enrollment) => enrollment.userId)
    );
    const attendanceDate = new Date(date.toISOString().split("T")[0] + "T00:00:00.000Z");

    await Promise.all(
      entries
        .filter((entry: any): entry is { userId: string; status: "present" | "absent" | "late" } =>
          Boolean(entry?.userId) && ALLOWED_STATUSES.has(entry.status) && validStudentIds.has(entry.userId)
        )
        .map((entry: any) =>
          prisma.attendance.upsert({
            where: {
              userId_courseId_termId_date: {
                userId: entry.userId,
                courseId,
                termId,
                date: attendanceDate,
              },
            },
            update: {
              status: entry.status,
              markedBy: sessionUser.id,
            },
            create: {
              userId: entry.userId,
              courseId,
              termId,
              date: attendanceDate,
              status: entry.status,
              markedBy: sessionUser.id,
            },
          })
        )
    );

    return NextResponse.json({ message: "Attendance saved" });
  } catch (error) {
    console.error("Faculty attendance save failed", error);
    return NextResponse.json({ message: "Failed to save attendance" }, { status: 500 });
  }
}
