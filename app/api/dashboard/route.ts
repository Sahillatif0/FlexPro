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

    const [enrollments, transcripts, attendance, invoices, activeTerm] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: true,
          term: true,
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      prisma.transcript.findMany({
        where: { userId },
        include: {
          course: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.attendance.findMany({
        where: { userId },
      }),
      prisma.feeInvoice.findMany({
        where: { userId },
        include: {
          term: true,
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.term.findFirst({ where: { isActive: true } }),
    ]);

    const enrolledCourses = enrollments.map((enrollment) => ({
      id: enrollment.course.id,
      code: enrollment.course.code,
      title: enrollment.course.title,
      creditHours: enrollment.course.creditHours,
      department: enrollment.course.department,
      term: enrollment.term?.name ?? null,
    }));

    const totalCreditHours = enrolledCourses.reduce(
      (sum, course) => sum + course.creditHours,
      0
    );

    const recentGrades = transcripts.map((item) => ({
      courseCode: item.course.code,
      courseTitle: item.course.title,
      grade: item.grade,
      gradePoints: item.gradePoints,
      status: item.status,
      createdAt: item.createdAt,
    }));

    const attendanceRate = (() => {
      if (!attendance.length) return null;
      const present = attendance.filter((entry) => entry.status === 'present').length;
      return Math.round((present / attendance.length) * 1000) / 10;
    })();

    const courseAttendance = enrollments.map((enrollment) => {
      const courseEntries = attendance.filter(
        (entry) => entry.courseId === enrollment.courseId
      );
      if (!courseEntries.length) {
        return {
          courseCode: enrollment.course.code,
          present: 0,
          total: 0,
          percentage: null,
        };
      }

      const present = courseEntries.filter((entry) => entry.status === 'present').length;
      const percentage = Math.round((present / courseEntries.length) * 1000) / 10;

      return {
        courseCode: enrollment.course.code,
        present,
        total: courseEntries.length,
        percentage,
      };
    });

    const upcomingDeadlines = [
      ...invoices.map((invoice) => ({
        id: invoice.id,
        title: invoice.description,
        date: invoice.dueDate,
        type: invoice.status === 'pending' ? 'payment' : 'info',
      })),
    ];

    if (activeTerm) {
      upcomingDeadlines.push({
        id: `term-${activeTerm.id}-start`,
        title: `${activeTerm.name} Classes Start`,
        date: activeTerm.startDate,
        type: 'registration',
      });
      upcomingDeadlines.push({
        id: `term-${activeTerm.id}-end`,
        title: `${activeTerm.name} Finals`,
        date: activeTerm.endDate,
        type: 'exam',
      });
    }

    upcomingDeadlines.sort((a, b) => a.date.getTime() - b.date.getTime());

    return NextResponse.json({
      enrolledCourses,
      recentGrades,
      totalCreditHours,
      attendanceRate,
      attendanceByCourse: courseAttendance,
      deadlines: upcomingDeadlines,
    });
  } catch (error) {
    console.error('Dashboard API error', error);
    return NextResponse.json(
      { message: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
