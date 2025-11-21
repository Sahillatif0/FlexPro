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

    const [courses, recentNotes] = await Promise.all([
      prisma.course.findMany({
        where: {
          sections: {
            some: {
              instructorId: sessionUser.id,
            },
          },
        },
        include: {
          sections: {
            where: { instructorId: sessionUser.id },
            select: {
              id: true,
              name: true,
            },
          },
          enrollments: {
            include: {
              user: true,
              term: true,
            },
          },
          attendances: {
            include: {
              term: true,
              user: true,
            },
            orderBy: { date: "desc" },
          },
          transcripts: {
            include: {
              term: true,
              user: true,
            },
            where: { status: "final" },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { code: "asc" },
      } as any),
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

    const attendanceTimeline: {
      id: string;
      courseCode: string;
      status: string;
      date: Date;
    }[] = [];
    const gradeTimeline: {
      id: string;
      courseCode: string;
      grade: string;
      createdAt: Date;
    }[] = [];

    const courseStats = (courses as any[]).map((course) => {
      const sectionNameSet = new Set(
        (course.sections as any[])
          .map((section: any) => (section.name as string).trim().toLowerCase())
          .filter((name: string) => name.length > 0)
      );

      const isStudentAllowed = (user: any) => {
        const normalizedSection = (user?.section ?? "").trim().toLowerCase();
        if (!normalizedSection) {
          return true;
        }
        return sectionNameSet.has(normalizedSection);
      };

      const enrollments = (course.enrollments as any[]).filter((enrollment: any) =>
        isStudentAllowed(enrollment.user)
      );

      enrollments.forEach((enrollment: any) => {
        uniqueStudentIds.add(enrollment.userId);
      });

      const attendances = (course.attendances as any[]).filter((record: any) =>
        isStudentAllowed(record.user)
      );

      const transcripts = (course.transcripts as any[]).filter((record: any) =>
        isStudentAllowed(record.user)
      );

      attendances.forEach((record: any) =>
        attendanceTimeline.push({
          id: record.id,
          courseCode: course.code,
          status: record.status,
          date: record.date,
        })
      );

      transcripts.forEach((record: any) =>
        gradeTimeline.push({
          id: record.id,
          courseCode: course.code,
          grade: record.grade,
          createdAt: record.createdAt,
        })
      );

      const transcriptLookup = new Map(
        transcripts.map((record: any) => [`${record.userId}-${record.termId}`, record])
      );

      enrollments.forEach((enrollment: any) => {
        if (!transcriptLookup.has(`${enrollment.userId}-${enrollment.termId}`)) {
          pendingGradeEntries += 1;
        }
      });

      const lastAttendance = attendances[0];
      if (!lastAttendance || daysBetween(lastAttendance.date) >= 7) {
        pendingAttendanceSessions += 1;
      }

      const attendanceTotals = attendances.reduce(
        (acc: any, record: any) => {
          acc.total += 1;
          if (record.status === "present") {
            acc.present += 1;
          }
          return acc;
        },
        { present: 0, total: 0 }
      );

      const gradeAverageData = transcripts.reduce(
        (acc: any, record: any) => {
          acc.total += 1;
          acc.points += record.gradePoints;
          return acc;
        },
        { points: 0, total: 0 }
      );

      const mostRecentTerm = enrollments
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

    const recentAttendanceActivities = attendanceTimeline
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)
      .map((record) => ({
        id: `attendance-${record.id}`,
        type: "attendance" as const,
        title: `${record.courseCode} attendance updated`,
        description: `${record.status.toUpperCase()} marked on ${record.date.toLocaleDateString()}`,
        timestamp: record.date.toISOString(),
      }));

    const recentGradeActivities = gradeTimeline
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((record) => ({
        id: `grade-${record.id}`,
        type: "grade" as const,
        title: `${record.courseCode} grade submitted`,
        description: `Grade ${record.grade} recorded`,
        timestamp: record.createdAt.toISOString(),
      }));

    const recentActivities = [...recentAttendanceActivities, ...recentGradeActivities]
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
