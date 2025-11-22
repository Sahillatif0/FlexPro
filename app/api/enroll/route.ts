import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CREDIT_LIMIT = 21;

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

    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    if (!activeTerm) {
      return NextResponse.json(
        { message: 'No active term configured' },
        { status: 404 }
      );
    }

    const [courses, userEnrollments, student] = await Promise.all([
      prisma.course.findMany({
        where: { isActive: true },
        include: {
          sections: true,
          _count: {
            select: { enrollments: { where: { termId: activeTerm.id } } },
          },
        },
        orderBy: [{ semester: 'asc' }, { code: 'asc' }],
      } as any),
      prisma.enrollment.findMany({
        where: {
          userId,
          termId: activeTerm.id,
        },
        include: {
          course: true,
        },
      }),
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

    const departments = Array.from(new Set(courses.map((course) => course.department))).sort();

    const availableCourses = (courses as any[]).map((course: any) => {
      const enrolledCount = course._count.enrollments;
      const alreadyEnrolled = userEnrollments.some(
        (enrollment) => enrollment.courseId === course.id
      );
      const hasCapacity = enrolledCount < course.maxCapacity;

      const courseSections = Array.isArray(course.sections)
        ? course.sections.map((section: any) => ({
          id: section.id as string,
          name: section.name as string,
          normalizedName: (section.name as string).trim().toLowerCase(),
        }))
        : [];

      const hasDefinedSections = courseSections.length > 0;
      const sectionMatches = !hasDefinedSections || !normalizedStudentSection
        ? true
        : courseSections.some((section: any) => section.normalizedName === normalizedStudentSection);

      return {
        id: course.id,
        code: course.code,
        title: course.title,
        creditHours: course.creditHours,
        prerequisite: course.prerequisite ?? null,
        enrolled: enrolledCount,
        capacity: course.maxCapacity,
        department: course.department,
        semester: course.semester,
        available: hasCapacity && !alreadyEnrolled && sectionMatches,
        alreadyEnrolled,
        sections: courseSections.map((section: any) => ({ id: section.id as string, name: section.name as string })),
        matchesStudentSection: sectionMatches,
        studentSection: studentSectionName || null,
      };
    });

    const currentCredits = (userEnrollments as any[]).reduce(
      (sum, enrollment: any) => sum + (enrollment.course?.creditHours ?? 0),
      0
    );

    return NextResponse.json({
      term: {
        id: activeTerm.id,
        name: activeTerm.name,
        season: activeTerm.season,
        year: activeTerm.year,
        registrationEndsOn: activeTerm.startDate,
      },
      courses: availableCourses,
      departments,
      summary: {
        availableCount: availableCourses.filter((course) => course.available).length,
        currentCredits,
        creditLimit: CREDIT_LIMIT,
        enrolledCount: userEnrollments.length,
      },
    });
  } catch (error) {
    console.error('Enrollment GET API error', error);
    return NextResponse.json(
      { message: 'Failed to load available courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, courseId } = body as { userId?: string; courseId?: string };

    if (!userId || !courseId) {
      return NextResponse.json(
        { message: 'userId and courseId are required' },
        { status: 400 }
      );
    }

    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    if (!activeTerm) {
      return NextResponse.json(
        { message: 'No active term configured' },
        { status: 404 }
      );
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    const student = await prisma.user.findUnique({ where: { id: userId } });
    if (!student) {
      return NextResponse.json(
        { message: 'Student not found' },
        { status: 404 }
      );
    }

    const courseSections = await (prisma as any).courseSection.findMany({
      where: { courseId },
    });

    const studentRecord = student as any;
    const normalizedStudentSection = typeof studentRecord.section === 'string'
      ? studentRecord.section.trim().toLowerCase()
      : '';
    const hasDefinedSections = Array.isArray(courseSections) && courseSections.length > 0;

    if (hasDefinedSections && normalizedStudentSection) {
      const matchesSection = (courseSections as any[]).some(
        (section: any) => (section.name as string).trim().toLowerCase() === normalizedStudentSection
      );

      if (!matchesSection) {
        return NextResponse.json(
          { message: 'This course is not available for your section' },
          { status: 409 }
        );
      }
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId_termId: {
          userId,
          courseId,
          termId: activeTerm.id,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { message: 'Already enrolled in this course for the active term' },
        { status: 409 }
      );
    }

    const enrollmentCount = await prisma.enrollment.count({
      where: { courseId, termId: activeTerm.id },
    });

    if (enrollmentCount >= course.maxCapacity) {
      return NextResponse.json(
        { message: 'Course capacity has been reached' },
        { status: 409 }
      );
    }

    const existingEnrollments = await prisma.enrollment.findMany({
      where: { userId, termId: activeTerm.id },
      include: {
        course: true,
      },
    });

    const creditSum = existingEnrollments.reduce(
      (sum, enrollment) => sum + (enrollment.course?.creditHours ?? 0),
      0
    );

    if (creditSum + course.creditHours > CREDIT_LIMIT) {
      return NextResponse.json(
        { message: 'Enrolling would exceed the credit hour limit for the term' },
        { status: 409 }
      );
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        termId: activeTerm.id,
        status: 'enrolled',
      },
      include: {
        course: true,
        term: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Enrollment successful',
        enrollment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Enrollment POST API error', error);
    return NextResponse.json(
      { message: 'Failed to enroll in course' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId, courseId } = body as { userId?: string; courseId?: string };

    if (!userId || !courseId) {
      return NextResponse.json(
        { message: 'userId and courseId are required' },
        { status: 400 }
      );
    }

    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    if (!activeTerm) {
      return NextResponse.json(
        { message: 'No active term configured' },
        { status: 404 }
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId_termId: {
          userId,
          courseId,
          termId: activeTerm.id,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { message: 'Enrollment not found' },
        { status: 404 }
      );
    }

    await prisma.enrollment.delete({
      where: {
        id: enrollment.id,
      },
    });

    return NextResponse.json(
      { message: 'Course dropped successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Enrollment DELETE API error', error);
    return NextResponse.json(
      { message: 'Failed to drop course' },
      { status: 500 }
    );
  }
}
