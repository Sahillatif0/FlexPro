import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function totalToGrade(total: number) {
  // simple mapping, adjust per institution policy
  if (total >= 85) return { grade: 'A', gradePoints: 4.0 };
  if (total >= 80) return { grade: 'A-', gradePoints: 3.67 };
  if (total >= 75) return { grade: 'B+', gradePoints: 3.33 };
  if (total >= 70) return { grade: 'B', gradePoints: 3.0 };
  if (total >= 65) return { grade: 'B-', gradePoints: 2.67 };
  if (total >= 60) return { grade: 'C+', gradePoints: 2.33 };
  if (total >= 55) return { grade: 'C', gradePoints: 2.0 };
  if (total >= 50) return { grade: 'C-', gradePoints: 1.67 };
  if (total >= 40) return { grade: 'D', gradePoints: 1.0 };
  return { grade: 'F', gradePoints: 0.0 };
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionFromRequest(request);
    if (!sessionUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    if (sessionUser.role !== 'faculty') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const courseId = typeof body?.courseId === 'string' ? body.courseId : null;
    const termId = typeof body?.termId === 'string' ? body.termId : null;
    const rawSectionId = typeof body?.sectionId === 'string' ? body.sectionId : null;

    if (!courseId || !termId) {
      return NextResponse.json({ message: 'courseId and termId are required' }, { status: 400 });
    }

    // verify faculty teaches this course
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        sections: { some: { instructorId: sessionUser.id } },
      },
      include: { sections: true },
    });

    if (!course) return NextResponse.json({ message: 'Course not found' }, { status: 404 });

    const sectionNameSet = new Set(
      course.sections.map((s) => (s.name ?? '').trim().toLowerCase()).filter((s) => s.length > 0)
    );

    // fetch enrollments for selection
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, termId },
      include: { user: true, studentMark: true },
    });

    let filtered = enrollments;
    if (rawSectionId && rawSectionId !== 'ALL') {
      if (rawSectionId === '__unassigned__') {
        filtered = enrollments.filter((en) => {
          const s = (en.user?.section ?? '').trim().toLowerCase();
          return !s || !sectionNameSet.has(s);
        });
      } else {
        const matching = course.sections.find((sec) => sec.id === rawSectionId);
        if (!matching) return NextResponse.json({ message: 'Section not found' }, { status: 404 });
        const targetName = (matching.name ?? '').trim().toLowerCase();
        filtered = enrollments.filter((en) => (en.user?.section ?? '').trim().toLowerCase() === targetName);
      }
    }

    const toProcess = filtered.filter((en) => en.studentMark && typeof en.studentMark.total === 'number');

    const results: Array<{ userId: string; created: boolean; grade: string }> = [];

    // process each student: upsert transcript and mark enrollment completed
    const tx = await prisma.$transaction(async (txClient) => {
      for (const en of toProcess) {
        const total = en.studentMark.total;
        const { grade, gradePoints } = totalToGrade(total);

        // find course record for courseId to get creditHours
        const courseRecord = await txClient.course.findUnique({ where: { id: courseId } });
        const creditHours = courseRecord?.creditHours ?? 0;

        // upsert transcript
        await txClient.transcript.upsert({
          where: {
            userId_courseId_termId_status: {
              userId: en.userId,
              courseId,
              termId,
              status: 'final',
            },
          },
          update: {
            grade,
            gradePoints,
          },
          create: {
            userId: en.userId,
            courseId,
            termId,
            grade,
            gradePoints,
            status: 'final',
          },
        });

        // mark enrollment completed
        await txClient.enrollment.update({
          where: { id: en.id },
          data: { status: 'completed' },
        });

        results.push({ userId: en.userId, created: true, grade });
      }
    });

    return NextResponse.json({
      message: 'Finalization completed',
      processed: results.length,
      skipped: filtered.length - toProcess.length,
      details: results,
    });
  } catch (error) {
    console.error('Finalize grades failed', error);
    return NextResponse.json({ message: 'Failed to finalize grades' }, { status: 500 });
  }
}
