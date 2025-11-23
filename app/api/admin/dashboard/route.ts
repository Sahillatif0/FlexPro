import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const [
      totalStudents,
      totalFaculty,
      totalCourses,
      totalEnrollments,
      pendingGradeRequests,
      recentCourses,
      latestEnrollments,
      latestGradeRequests,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "student" } }),
      prisma.user.count({ where: { role: "faculty" } }),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.gradeRequest.count({ where: { status: "pending" } }),
      prisma.course.findMany({
        select: {
          id: true,
          code: true,
          title: true,
          department: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.enrollment.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, studentId: true } },
          course: { select: { code: true, title: true } },
        },
        orderBy: { enrolledAt: "desc" },
        take: 6,
      }),
      prisma.gradeRequest.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, studentId: true } },
          term: { select: { name: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 6,
      }),
    ]);

    const recentActivity = [
      ...latestEnrollments.map((item) => ({
        id: `enrollment-${item.id}`,
        title: `${item.user.firstName} ${item.user.lastName} enrolled in ${item.course.code}`,
        description: `${item.course.title} · ${item.user.studentId}`,
        timestamp: item.enrolledAt.toISOString(),
        type: "enrollment" as const,
      })),
      ...latestGradeRequests.map((item) => ({
        id: `grade-${item.id}`,
        title: `${item.user.firstName} ${item.user.lastName} submitted a grade review`,
        description: `${item.courseCode} · ${item.term?.name ?? "Current term"}`,
        timestamp: item.submittedAt.toISOString(),
        type: "grade" as const,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        totalStudents,
        totalFaculty,
        totalCourses,
        totalEnrollments,
        pendingGradeRequests,
      },
      recentCourses,
      recentActivity,
    });
  } catch (error) {
    console.error("Admin dashboard error", error);
    return NextResponse.json({ message: "Failed to load admin dashboard" }, { status: 500 });
  }
}
