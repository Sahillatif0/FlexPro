import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ROUTE_DYNAMIC, ROUTE_REVALIDATE, ROUTE_FETCH_CACHE } from "@/lib/route-config";

export const dynamic = ROUTE_DYNAMIC;
export const revalidate = ROUTE_REVALIDATE;
export const fetchCache = ROUTE_FETCH_CACHE;

const ALLOWED_STATUSES = ["pending", "approved", "rejected"] as const;
const STATUS_SET = new Set(ALLOWED_STATUSES);

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

type CourseLookup = {
  courseId: string;
  courseTitle: string;
  sections: Set<string>;
};

type GradeRequestItem = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  studentSection: string | null;
  courseCode: string;
  courseTitle: string;
  termId: string;
  termName: string | null;
  currentGrade: string;
  requestedGrade: string;
  reason: string;
  status: AllowedStatus;
  notes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
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

    const facultyCourses = await prisma.course.findMany({
      where: {
        sections: {
          some: {
            instructorId: sessionUser.id,
          },
        },
      },
      include: {
        sections: {
          where: {
            instructorId: sessionUser.id,
          },
          select: {
            name: true,
          },
        },
      },
    });

    if (!facultyCourses.length) {
      return NextResponse.json({
        gradeRequests: [] as GradeRequestItem[],
        summary: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        },
        filters: {
          courses: [] as Array<{ courseId: string; courseCode: string; courseTitle: string }>,
          terms: [] as Array<{ id: string; name: string }>,
          statuses: ALLOWED_STATUSES,
        },
      });
    }

    const courseMap = new Map<string, CourseLookup>();

    facultyCourses.forEach((course) => {
      const rawSections = Array.isArray((course as any).sections)
        ? ((course as any).sections as Array<{ name: string | null }>)
        : [];
      const normalizedSections = new Set(
        rawSections
          .map((section) => (section?.name ?? "").trim().toLowerCase())
          .filter((name) => name.length > 0)
      );

      courseMap.set(course.code, {
        courseId: course.id,
        courseTitle: course.title,
        sections: normalizedSections,
      });
    });

    const gradeRequests = await prisma.gradeRequest.findMany({
      where: {
        courseCode: {
          in: Array.from(courseMap.keys()),
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
      include: {
        user: true,
        term: true,
      },
    });

    const items: GradeRequestItem[] = gradeRequests
      .filter((request) => {
        const courseInfo = courseMap.get(request.courseCode);
        if (!courseInfo) {
          return false;
        }

        const normalizedStudentSection = (request.user?.section ?? "").trim().toLowerCase();
        if (!courseInfo.sections.size) {
          return true;
        }

        if (!normalizedStudentSection) {
          return true;
        }

        return courseInfo.sections.has(normalizedStudentSection);
      })
      .map((request) => {
        const courseInfo = courseMap.get(request.courseCode);
        const firstName = request.user?.firstName ?? "";
        const lastName = request.user?.lastName ?? "";
        const studentName = `${firstName} ${lastName}`.trim() || "Unknown";

        return {
          id: request.id,
          studentId: request.userId,
          studentName,
          studentEmail: request.user?.email ?? null,
          studentSection: request.user?.section ?? null,
          courseCode: request.courseCode,
          courseTitle: courseInfo?.courseTitle ?? request.courseCode,
          termId: request.termId,
          termName: request.term?.name ?? null,
          currentGrade: request.currentGrade,
          requestedGrade: request.requestedGrade,
          reason: request.reason,
          status: STATUS_SET.has(request.status as AllowedStatus)
            ? (request.status as AllowedStatus)
            : "pending",
          notes: request.adminNotes ?? null,
          submittedAt: request.submittedAt.toISOString(),
          reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null,
        };
      });

    const summary = {
      total: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
    };

    const termMap = new Map<string, { id: string; name: string }>();
    items.forEach((item) => {
      if (item.termId && item.termName && !termMap.has(item.termId)) {
        termMap.set(item.termId, { id: item.termId, name: item.termName });
      }
    });

    const courses = Array.from(courseMap.entries())
      .map(([courseCode, info]) => ({
        courseId: info.courseId,
        courseCode,
        courseTitle: info.courseTitle,
      }))
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));

    return NextResponse.json({
      gradeRequests: items,
      summary,
      filters: {
        courses,
        terms: Array.from(termMap.values()),
        statuses: ALLOWED_STATUSES,
      },
    });
  } catch (error) {
    console.error("Faculty grade requests fetch failed", error);
    return NextResponse.json(
      { message: "Failed to load grade requests" },
      { status: 500 }
    );
  }
}
