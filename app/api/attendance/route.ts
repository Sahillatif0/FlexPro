import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ROUTE_DYNAMIC, ROUTE_REVALIDATE, ROUTE_FETCH_CACHE } from '@/lib/route-config';

export const dynamic = ROUTE_DYNAMIC;
export const revalidate = ROUTE_REVALIDATE;
export const fetchCache = ROUTE_FETCH_CACHE;

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

    const [enrollments, attendanceRecords] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: true,
        },
      }),
      prisma.attendance.findMany({
        where: { userId },
        include: {
          course: true,
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const courseStats = enrollments.map((enrollment) => {
      const courseEntries = attendanceRecords.filter(
        (record) => record.courseId === enrollment.courseId
      );
      const total = courseEntries.length;
      const present = courseEntries.filter((entry) => entry.status === 'present').length;
      const percentage = total ? Math.round((present / total) * 1000) / 10 : null;

      return {
        courseCode: enrollment.course.code,
        present,
        total,
        percentage,
      };
    });

    const totalPresent = courseStats.reduce((sum, stat) => sum + stat.present, 0);
    const totalClasses = courseStats.reduce((sum, stat) => sum + stat.total, 0);
    const overallAttendance = totalClasses
      ? Math.round((totalPresent / totalClasses) * 1000) / 10
      : null;

    const records = attendanceRecords.map((record) => ({
      id: record.id,
      courseId: record.courseId,
      courseCode: record.course?.code ?? '',
      courseTitle: record.course?.title ?? '',
      date: record.date,
      status: record.status,
      markedBy: record.markedBy ?? null,
    }));

    const courses = enrollments.map((enrollment) => ({
      courseId: enrollment.courseId,
      courseCode: enrollment.course.code,
      courseTitle: enrollment.course.title,
    }));

    return NextResponse.json({
      records,
      courseStats,
      summary: {
        totalPresent,
        totalClasses,
        overallAttendance,
      },
      courses,
    });
  } catch (error) {
    console.error('Attendance API error', error);
    return NextResponse.json(
      { message: 'Failed to load attendance data' },
      { status: 500 }
    );
  }
}
