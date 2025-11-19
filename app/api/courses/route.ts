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

    const [enrollments, attendanceRecords, transcripts, activeTerm] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              _count: {
                select: { enrollments: true },
              },
            },
          },
          term: true,
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      prisma.attendance.findMany({
        where: { userId },
      }),
      prisma.transcript.findMany({
        where: { userId },
        include: {
          course: true,
          term: true,
        },
      }),
      prisma.term.findFirst({ where: { isActive: true } }),
    ]);

    const courses = enrollments.map((enrollment) => ({
      id: enrollment.id,
      courseId: enrollment.courseId,
      code: enrollment.course.code,
      title: enrollment.course.title,
      creditHours: enrollment.course.creditHours,
      prerequisite: enrollment.course.prerequisite ?? null,
      enrolled: enrollment.course._count.enrollments,
      capacity: enrollment.course.maxCapacity,
      department: enrollment.course.department,
      status: enrollment.status,
      term: enrollment.term?.name ?? null,
    }));

    const totalCreditHours = courses.reduce((sum, course) => sum + course.creditHours, 0);
    const presentCount = attendanceRecords.filter((record) => record.status === 'present').length;
    const totalAttendance = attendanceRecords.length;
    const averageAttendance = totalAttendance
      ? Math.round((presentCount / totalAttendance) * 1000) / 10
      : null;

    let semesterGpa: number | null = null;
    if (activeTerm) {
      const termTranscripts = transcripts.filter((entry) => entry.termId === activeTerm.id);
      const totalQualityPoints = termTranscripts.reduce((sum, entry) => {
        const creditHours = entry.course?.creditHours ?? 0;
        return sum + entry.gradePoints * creditHours;
      }, 0);
      const totalCreditsForTerm = termTranscripts.reduce((sum, entry) => {
        return sum + (entry.course?.creditHours ?? 0);
      }, 0);

      if (totalCreditsForTerm > 0) {
        semesterGpa = totalQualityPoints / totalCreditsForTerm;
      }
    }

    return NextResponse.json({
      courses,
      summary: {
        totalCreditHours,
        averageAttendance,
        semesterGpa,
        enrolledCount: courses.length,
      },
    });
  } catch (error) {
    console.error('Courses API error', error);
    return NextResponse.json(
      { message: 'Failed to load courses' },
      { status: 500 }
    );
  }
}
