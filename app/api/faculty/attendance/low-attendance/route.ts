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
        const courseId = searchParams.get("courseId");
        const termId = searchParams.get("termId");
        const sectionId = searchParams.get("sectionId");

        if (!courseId || !termId) {
            return NextResponse.json({ message: "courseId and termId are required" }, { status: 400 });
        }

        const course = await prisma.course.findFirst({
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
        });

        if (!course) {
            return NextResponse.json({ message: "Course not found or access denied" }, { status: 404 });
        }

        const sessions = await prisma.attendance.groupBy({
            by: ['date'],
            where: {
                courseId,
                termId,
            },
        });

        const totalSessions = sessions.length;

        if (totalSessions === 0) {
            return NextResponse.json({ students: [] });
        }

        const enrollments = await prisma.enrollment.findMany({
            where: {
                courseId,
                termId,
            },
            include: {
                user: true,
            },
        });

        let filteredEnrollments = enrollments;
        if (sectionId && sectionId !== "__all__") {
            if (sectionId === "__unassigned__") {
                filteredEnrollments = enrollments.filter(e => !e.user.section);
            } else {
                const targetSection = course.sections.find(s => s.id === sectionId);
                if (targetSection) {
                    const targetName = targetSection.name.trim().toLowerCase();
                    filteredEnrollments = enrollments.filter(e => e.user.section?.trim().toLowerCase() === targetName);
                }
            }
        }

        const studentIds = filteredEnrollments.map(e => e.userId);

        // Get all attendance records for these students
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                courseId,
                termId,
                userId: { in: studentIds },
                status: { in: ['present', 'late', 'absent'] },
            },
            select: {
                userId: true,
                date: true,
                status: true,
            },
            orderBy: {
                date: 'desc',
            },
        });

        // Group records by user
        const recordsByUser = new Map<string, { date: Date; status: string }[]>();
        attendanceRecords.forEach(record => {
            if (!recordsByUser.has(record.userId)) {
                recordsByUser.set(record.userId, []);
            }
            recordsByUser.get(record.userId)!.push({
                date: record.date,
                status: record.status,
            });
        });

        // Calculate percentage and filter < 80%
        const lowAttendanceStudents = filteredEnrollments.map(enrollment => {
            const records = recordsByUser.get(enrollment.userId) || [];
            const attended = records.filter(r => r.status === 'present' || r.status === 'late').length;
            const percentage = (attended / totalSessions) * 100;

            return {
                userId: enrollment.userId,
                studentId: enrollment.user.studentId,
                firstName: enrollment.user.firstName,
                lastName: enrollment.user.lastName,
                email: enrollment.user.email,
                sectionName: enrollment.user.section,
                attendedSessions: attended,
                totalSessions: totalSessions,
                percentage: parseFloat(percentage.toFixed(1)),
                history: records.map(r => ({
                    date: r.date.toISOString().split('T')[0],
                    status: r.status,
                })),
            };
        }).filter(student => student.percentage < 80);

        lowAttendanceStudents.sort((a, b) => a.percentage - b.percentage);

        return NextResponse.json({ students: lowAttendanceStudents });

    } catch (error) {
        console.error("Low attendance fetch failed", error);
        return NextResponse.json({ message: "Failed to load low attendance data" }, { status: 500 });
    }
}
