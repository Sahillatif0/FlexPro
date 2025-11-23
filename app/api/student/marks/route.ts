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

        // Fetch enrollments with marks and user info (for section)
        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId: sessionUser.id,
            },
            include: {
                course: true,
                term: true,
                studentMark: true,
                user: true,
            },
            orderBy: {
                term: {
                    startDate: 'desc',
                },
            },
        });

        const marksWithStats = await Promise.all(enrollments.map(async (enrollment) => {
            const section = enrollment.user.section;

            // Initialize stats
            const stats = {
                assignment1: { min: 0, max: 0, avg: 0 },
                assignment2: { min: 0, max: 0, avg: 0 },
                quiz1: { min: 0, max: 0, avg: 0 },
                quiz2: { min: 0, max: 0, avg: 0 },
                quiz3: { min: 0, max: 0, avg: 0 },
                quiz4: { min: 0, max: 0, avg: 0 },
                mid1: { min: 0, max: 0, avg: 0 },
                mid2: { min: 0, max: 0, avg: 0 },
                finalExam: { min: 0, max: 0, avg: 0 },
                graceMarks: { min: 0, max: 0, avg: 0 },
                total: { min: 0, max: 0, avg: 0 },
            };

            if (section) {
                // Fetch all marks for this course, term, and section
                const classMarks = await prisma.studentMark.findMany({
                    where: {
                        enrollment: {
                            courseId: enrollment.courseId,
                            termId: enrollment.termId,
                            user: {
                                section: section,
                            },
                        },
                    },
                });

                if (classMarks.length > 0) {
                    const fields = [
                        'assignment1', 'assignment2',
                        'quiz1', 'quiz2', 'quiz3', 'quiz4',
                        'mid1', 'mid2', 'finalExam', 'graceMarks', 'total'
                    ] as const;

                    fields.forEach(field => {
                        const values = classMarks.map(m => m[field]);
                        stats[field].min = Math.min(...values);
                        stats[field].max = Math.max(...values);
                        stats[field].avg = values.reduce((a, b) => a + b, 0) / values.length;
                    });
                }
            }

            return {
                courseCode: enrollment.course.code,
                courseTitle: enrollment.course.title,
                termName: enrollment.term.name,
                marks: enrollment.studentMark,
                stats,
            };
        }));

        return NextResponse.json({ marks: marksWithStats });
    } catch (error) {
        console.error("Student marks fetch failed", error);
        return NextResponse.json({ message: "Failed to load marks" }, { status: 500 });
    }
}
