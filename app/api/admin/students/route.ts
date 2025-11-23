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

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100;

    const students = (await prisma.user.findMany({
      where: { role: "student" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        studentId: true,
        program: true,
        semester: true,
        cgpa: true,
        isActive: true,
        createdAt: true,
      },
    })) as any[];

    const studentIds = students.map((student) => student.id);

    if (!studentIds.length) {
      return NextResponse.json({ students: [] });
    }

    const [enrollments, feeInvoices, gradeRequests] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true },
      }),
      prisma.feeInvoice.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true, status: true },
      }),
      prisma.gradeRequest.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true, status: true },
      }),
    ]);

    const enrollmentCount = enrollments.reduce<Record<string, number>>((acc, enrollment) => {
      acc[enrollment.userId] = (acc[enrollment.userId] ?? 0) + 1;
      return acc;
    }, {});

    const pendingFees = feeInvoices.reduce<Record<string, number>>((acc, invoice) => {
      if (invoice.status !== "paid") {
        acc[invoice.userId] = (acc[invoice.userId] ?? 0) + 1;
      }
      return acc;
    }, {});

    const pendingGrades = gradeRequests.reduce<Record<string, number>>((acc, request) => {
      if (request.status === "pending") {
        acc[request.userId] = (acc[request.userId] ?? 0) + 1;
      }
      return acc;
    }, {});

    return NextResponse.json({
      students: students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        studentId: student.studentId,
        program: student.program,
        semester: student.semester,
        cgpa: student.cgpa,
        isActive: student.isActive,
        enrolledCourses: enrollmentCount[student.id] ?? 0,
        pendingFeeInvoices: pendingFees[student.id] ?? 0,
        pendingGradeRequests: pendingGrades[student.id] ?? 0,
        createdAt: student.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Admin students fetch error", error);
    return NextResponse.json({ message: "Failed to load students" }, { status: 500 });
  }
}
