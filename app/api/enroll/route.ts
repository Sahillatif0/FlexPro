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

    const [courses, userEnrollments] = await Promise.all([
      prisma.course.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { enrollments: { where: { termId: activeTerm.id } } },
          },
        },
        orderBy: [{ semester: 'asc' }, { code: 'asc' }],
      }),
      prisma.enrollment.findMany({
        where: {
          userId,
          termId: activeTerm.id,
        },
        include: {
          course: true,
        },
      }),
    ]);

    const departments = Array.from(new Set(courses.map((course) => course.department))).sort();

    const availableCourses = courses.map((course) => {
      const enrolledCount = course._count.enrollments;
      const alreadyEnrolled = userEnrollments.some(
        (enrollment) => enrollment.courseId === course.id
      );
      const hasCapacity = enrolledCount < course.maxCapacity;

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
        available: hasCapacity && !alreadyEnrolled,
        alreadyEnrolled,
      };
    });

    const currentCredits = userEnrollments.reduce(
      (sum, enrollment) => sum + (enrollment.course?.creditHours ?? 0),
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
