import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    // Verify faculty teaches this course
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
    });

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const sectionNameSet = new Set(
      course.sections
        .map((section) => section.name.trim().toLowerCase())
        .filter((name) => name.length > 0)
    );

    // Fetch enrollments with student marks
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        termId,
      },
      include: {
        user: true,
        studentMark: true,
      },
    });

    const records = enrollments
      .filter((enrollment) => {
        const normalizedStudentSection = (enrollment.user?.section ?? "").trim().toLowerCase();
        if (!normalizedStudentSection) {
          return true;
        }
        return sectionNameSet.has(normalizedStudentSection);
      })
      .map((enrollment) => ({
        userId: enrollment.userId,
        studentMark: enrollment.studentMark,
      }));

    return NextResponse.json({ records });
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

    // Verify faculty teaches this course
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
    });

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const sectionNameSet = new Set(
      course.sections
        .map((section) => section.name.trim().toLowerCase())
        .filter((name) => name.length > 0)
    );

    // Get enrollments to verify students and get enrollment IDs
    const studentIds = entries.map((e: any) => e.userId);
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

    const validEnrollments = enrollments.filter((enrollment) => {
      const normalizedStudentSection = (enrollment.user?.section ?? "").trim().toLowerCase();
      if (!normalizedStudentSection) {
        return true;
      }
      return sectionNameSet.has(normalizedStudentSection);
    });

    const enrollmentMap = new Map(validEnrollments.map((e) => [e.userId, e.id]));

    const tasks = entries
      .filter((entry: any) => enrollmentMap.has(entry.userId))
      .map((entry: any) => {
        const enrollmentId = enrollmentMap.get(entry.userId)!;

        return prisma.studentMark.upsert({
          where: {
            enrollmentId,
          },
          update: {
            assignment1: entry.assignment1,
            assignment2: entry.assignment2,
            quiz1: entry.quiz1,
            quiz2: entry.quiz2,
            quiz3: entry.quiz3,
            quiz4: entry.quiz4,
            mid1: entry.mid1,
            mid2: entry.mid2,
            finalExam: entry.finalExam,
            graceMarks: entry.graceMarks,
            total: entry.total,
          },
          create: {
            enrollmentId,
            assignment1: entry.assignment1,
            assignment2: entry.assignment2,
            quiz1: entry.quiz1,
            quiz2: entry.quiz2,
            quiz3: entry.quiz3,
            quiz4: entry.quiz4,
            mid1: entry.mid1,
            mid2: entry.mid2,
            finalExam: entry.finalExam,
            graceMarks: entry.graceMarks,
            total: entry.total,
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
