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
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");
    const termId = searchParams.get("termId");

    if (!studentId) {
      return NextResponse.json({ message: "studentId is required" }, { status: 400 });
    }

    const notes = await (prisma as any).studentNote.findMany({
      where: {
        facultyId: sessionUser.id,
        studentId,
        courseId: courseId ?? undefined,
        termId: termId ?? undefined,
      },
      include: {
        course: true,
        term: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      notes: (notes as any[]).map((note: any) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        updatedAt: note.updatedAt.toISOString(),
        courseCode: note.course?.code ?? null,
        termName: note.term?.name ?? null,
      })),
    });
  } catch (error) {
    console.error("Faculty student notes fetch failed", error);
    return NextResponse.json({ message: "Failed to load student notes" }, { status: 500 });
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
    const studentId = body?.studentId as string | undefined;
    const courseId = body?.courseId as string | undefined;
    const termId = body?.termId as string | undefined;
    const title = body?.title as string | undefined;
    const content = body?.content as string | undefined;

    if (!studentId || !courseId || !termId || !title || !content) {
      return NextResponse.json({ message: "studentId, courseId, termId, title, and content are required" }, { status: 400 });
    }

    const courseAssignment = await prisma.course.findFirst({
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

    if (!courseAssignment) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const sectionNameSet = new Set(
      (Array.isArray((courseAssignment as any).sections) ? ((courseAssignment as any).sections as any[]) : [])
        .map((section: any) => (section.name as string).trim().toLowerCase())
        .filter((name: string) => name.length > 0)
    );

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        termId,
        userId: studentId,
      },
      include: {
        user: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json({ message: "Student is not enrolled in this course and term" }, { status: 400 });
    }

    const normalizedStudentSection = (((enrollment as any).user?.section ?? "") as string)
      .trim()
      .toLowerCase();

    if (normalizedStudentSection && !sectionNameSet.has(normalizedStudentSection)) {
      return NextResponse.json({ message: "Student belongs to a section you do not teach" }, { status: 403 });
    }

    const note = await (prisma as any).studentNote.upsert({
      where: {
        facultyId_studentId_courseId_termId_title: {
          facultyId: sessionUser.id,
          studentId,
          courseId,
          termId,
          title,
        },
      },
      update: {
        content,
      },
      create: {
        facultyId: sessionUser.id,
        studentId,
        courseId,
        termId,
        title,
        content,
      },
    });

    return NextResponse.json({
      message: "Note saved",
      noteId: note.id,
    });
  } catch (error: any) {
    console.error("Faculty student note save failed", error);
    return NextResponse.json({ message: "Failed to save note" }, { status: 500 });
  }
}
