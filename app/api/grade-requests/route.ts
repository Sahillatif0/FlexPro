import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const [gradeRequests, transcripts, enrollments, terms] = await Promise.all([
      prisma.gradeRequest.findMany({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        include: {
          term: true,
        },
      }),
      prisma.transcript.findMany({
        where: { userId },
        include: {
          course: true,
          term: true,
        },
      }),
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: true,
          term: true,
        },
      }),
      prisma.term.findMany({
        orderBy: { startDate: 'desc' },
      }),
    ]);

    const courseMap = new Map<string, { courseCode: string; courseName: string; termId: string; termName: string }>();

    transcripts.forEach((entry) => {
      if (!entry.course) return;
      courseMap.set(`${entry.course.code}-${entry.termId}`, {
        courseCode: entry.course.code,
        courseName: entry.course.title,
        termId: entry.termId,
        termName: entry.term?.name ?? 'Completed Term',
      });
    });

    enrollments.forEach((enrollment) => {
      courseMap.set(`${enrollment.course.code}-${enrollment.termId}`, {
        courseCode: enrollment.course.code,
        courseName: enrollment.course.title,
        termId: enrollment.termId,
        termName: enrollment.term?.name ?? 'Current Term',
      });
    });

    gradeRequests.forEach((request) => {
      const key = `${request.courseCode}-${request.termId}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          courseCode: request.courseCode,
          courseName: request.courseCode,
          termId: request.termId,
          termName: request.term?.name ?? 'Requested Term',
        });
      }
    });

    const gradeRequestItems = gradeRequests.map((request) => {
      const courseKey = `${request.courseCode}-${request.termId}`;
      const courseInfo = courseMap.get(courseKey);

      return {
        id: request.id,
        courseCode: request.courseCode,
        courseName: courseInfo?.courseName ?? request.courseCode,
        currentGrade: request.currentGrade,
        requestedGrade: request.requestedGrade,
        reason: request.reason,
        status: request.status,
        adminNotes: request.adminNotes ?? null,
        submittedAt: request.submittedAt,
        reviewedAt: request.reviewedAt,
        termId: request.termId,
        term: request.term?.name ?? courseInfo?.termName ?? null,
      };
    });

    const courseOptions = enrollments
      .filter((enrollment) => enrollment.status !== 'dropped')
      .map((enrollment) => ({
        courseCode: enrollment.course.code,
        courseName: enrollment.course.title,
        termId: enrollment.termId,
        termName: enrollment.term?.name ?? 'Term',
      }))
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));

    const termOptions = terms.map((term) => ({
      id: term.id,
      name: term.name,
    }));

    return NextResponse.json({
      gradeRequests: gradeRequestItems,
      courseOptions,
      termOptions,
      summary: {
        total: gradeRequestItems.length,
        pending: gradeRequestItems.filter((item) => item.status === 'pending').length,
        approved: gradeRequestItems.filter((item) => item.status === 'approved').length,
        rejected: gradeRequestItems.filter((item) => item.status === 'rejected').length,
      },
    });
  } catch (error) {
    console.error('Grade request GET API error', error);
    return NextResponse.json(
      { message: 'Failed to load grade requests' },
      { status: 500 }
    );
  }
}

interface GradeRequestPayload {
  userId?: string;
  courseCode?: string;
  currentGrade?: string;
  requestedGrade?: string;
  reason?: string;
  termId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GradeRequestPayload;
    const { userId, courseCode, currentGrade, requestedGrade, reason, termId } = body;

    if (!userId || !courseCode || !currentGrade || !requestedGrade || !reason || !termId) {
      return NextResponse.json(
        { message: 'userId, courseCode, currentGrade, requestedGrade, reason, and termId are required' },
        { status: 400 }
      );
    }

    const gradeRequest = await prisma.gradeRequest.create({
      data: {
        userId,
        termId,
        courseCode,
        currentGrade,
        requestedGrade,
        reason,
        status: 'pending',
      },
    });

    return NextResponse.json(
      {
        message: 'Grade request submitted successfully',
        gradeRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Grade request POST API error', error);
    return NextResponse.json(
      { message: 'Failed to submit grade request' },
      { status: 500 }
    );
  }
}
