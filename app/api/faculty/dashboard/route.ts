import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";

function daysBetween(date: Date) {
  const diff = Date.now() - date.getTime();
  return diff / (1000 * 60 * 60 * 24);
}

export async function GET() {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const sessionUser = await getSessionFromToken(token);

    if (!sessionUser) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (sessionUser.role !== "faculty") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const [courses, attendanceRecords, transcriptRecords, recentNotes] = await Promise.all([
      prisma.course.findMany({
        where: { instructorId: sessionUser.id } as any,
        include: {
          enrollments: {
            include: {
              user: true,
              term: true,
            },
          },
          attendances: {
            include: { term: true },
            orderBy: { date: "desc" },
          },
          transcripts: {
            include: { term: true },
            where: { status: "final" },
          },
        },
      }),
      prisma.attendance.findMany({
        where: { course: { instructorId: sessionUser.id } as any },
        include: {
          course: true,
        },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.transcript.findMany({
        where: { course: { instructorId: sessionUser.id } as any, status: "final" },
        include: {
          course: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      (prisma as any).studentNote.findMany({
        where: { facultyId: sessionUser.id },
        include: {
          student: true,
          course: true,
          term: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    const uniqueStudentIds = new Set<string>();
    let pendingGradeEntries = 0;
    let pendingAttendanceSessions = 0;

    const courseStats = (courses as any[]).map((course) => {
      (course.enrollments as any[]).forEach((enrollment: any) => {
        uniqueStudentIds.add(enrollment.userId);
      });

      const transcriptLookup = new Map(
        (course.transcripts as any[]).map((record: any) => [`${record.userId}-${record.termId}`, record])
      );

      (course.enrollments as any[]).forEach((enrollment: any) => {
        if (!transcriptLookup.has(`${enrollment.userId}-${enrollment.termId}`)) {
          pendingGradeEntries += 1;
        }
      });

      const lastAttendance = (course.attendances as any[])[0];
      if (!lastAttendance || daysBetween(lastAttendance.date) >= 7) {
        pendingAttendanceSessions += 1;
      }

      const attendanceTotals = (course.attendances as any[]).reduce(
        (acc: any, record: any) => {
          acc.total += 1;
          if (record.status === "present") {
            acc.present += 1;
          }
          return acc;
        },
        { present: 0, total: 0 }
      );

      const gradeAverageData = (course.transcripts as any[]).reduce(
        (acc: any, record: any) => {
          acc.total += 1;
          acc.points += record.gradePoints;
          return acc;
        },
        { points: 0, total: 0 }
      );

      const mostRecentTerm = (course.enrollments as any[])
        .map((enrollment: any) => enrollment.term)
        .sort((a: any, b: any) => b.startDate.getTime() - a.startDate.getTime())[0];

      return {
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        termName: mostRecentTerm ? `${mostRecentTerm.name}` : "—",
        attendanceRate:
          attendanceTotals.total > 0
            ? (attendanceTotals.present / attendanceTotals.total) * 100
            : null,
        averageGrade:
          gradeAverageData.total > 0 ? gradeAverageData.points / gradeAverageData.total : null,
      };
    });

    const recentActivities = [
      ...(attendanceRecords as any[]).map((record: any) => ({
        id: `attendance-${record.id}`,
        type: "attendance" as const,
        title: `${record.course.code} attendance updated`,
        description: `${record.status.toUpperCase()} marked on ${record.date.toLocaleDateString()}`,
        timestamp: record.date.toISOString(),
      })),
      ...(transcriptRecords as any[]).map((record: any) => ({
        id: `grade-${record.id}`,
        type: "grade" as const,
        title: `${record.course.code} grade submitted`,
        description: `Grade ${record.grade} recorded`,
        timestamp: record.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    return NextResponse.json({
      summary: {
        totalCourses: courses.length,
        totalStudents: uniqueStudentIds.size,
        pendingAttendance: pendingAttendanceSessions,
        pendingGrades: pendingGradeEntries,
      },
      courseStats,
      recentActivities,
      recentNotes: (recentNotes as any[]).map((note: any) => ({
        id: note.id,
        studentName: `${note.student.firstName} ${note.student.lastName}`,
        courseCode: note.course?.code ?? null,
        title: note.title,
        updatedAt: note.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Faculty dashboard error", error);
    return NextResponse.json({ message: "Failed to load dashboard" }, { status: 500 });
  }
}
