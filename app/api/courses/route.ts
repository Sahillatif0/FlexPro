import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    const [enrollments, attendanceRecords, transcripts, activeTerm, student] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              sections: {
                include: {
                  instructor: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      employeeId: true,
                    },
                  },
                },
              },
              _count: {
                select: { enrollments: true },
              },
            },
          } as any,
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
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!student) {
      return NextResponse.json(
        { message: 'Student not found' },
        { status: 404 }
      );
    }

    const studentRecord = student as any;
    const studentSectionName = typeof studentRecord.section === 'string' ? studentRecord.section.trim() : '';
    const normalizedStudentSection = studentSectionName.toLowerCase();

    type SectionInstructor = {
      id: string;
      firstName: string;
      lastName: string;
      employeeId: string | null;
    };

    type CourseSectionRecord = {
      id: string;
      name: string;
      normalizedName: string;
      instructor: SectionInstructor | null;
    };

    type CourseRecord = {
      code: string;
      title: string;
      creditHours: number;
      prerequisite: string | null;
      maxCapacity: number;
      department: string;
      sections?: Array<{
        id: string;
        name: string;
        instructor: SectionInstructor | null;
      }>;
      _count?: {
        enrollments: number;
      };
    };

    const courses = enrollments.map((enrollment) => {
      const courseRecord = enrollment.course as CourseRecord;
      const courseSections: CourseSectionRecord[] = Array.isArray(courseRecord.sections)
        ? courseRecord.sections.map((section) => ({
            id: section.id,
            name: section.name,
            normalizedName: section.name.trim().toLowerCase(),
            instructor: section.instructor,
          }))
        : [];

      const matchedSection = normalizedStudentSection
        ? courseSections.find((section) => section.normalizedName === normalizedStudentSection)
        : undefined;

      const matchedInstructor = matchedSection?.instructor
        ? {
            id: matchedSection.instructor.id,
            fullName: `${matchedSection.instructor.firstName} ${matchedSection.instructor.lastName}`,
            employeeId: matchedSection.instructor.employeeId,
          }
        : null;

      return {
        id: enrollment.id,
        courseId: enrollment.courseId,
        code: enrollment.course.code,
        title: enrollment.course.title,
        creditHours: enrollment.course.creditHours,
        prerequisite: enrollment.course.prerequisite ?? null,
        enrolled: courseRecord._count?.enrollments ?? 0,
        capacity: enrollment.course.maxCapacity,
        department: enrollment.course.department,
        status: enrollment.status,
        term: enrollment.term?.name ?? null,
        section: matchedSection ? matchedSection.name : studentSectionName || null,
        sectionInstructor: matchedInstructor,
        sections: courseSections.map((section) => ({
          id: section.id,
          name: section.name,
          instructor: section.instructor
            ? {
                id: section.instructor.id,
                fullName: `${section.instructor.firstName} ${section.instructor.lastName}`,
                employeeId: section.instructor.employeeId,
              }
            : null,
        })),
      };
    });

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
