import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const [plan, availableCourses] = await Promise.all([
      prisma.studyPlan.findFirst({
        where: { userId },
        include: {
          items: {
            include: {
              course: true,
            },
            orderBy: [{ semester: 'asc' }, { order: 'asc' }],
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.course.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    if (!plan) {
      return NextResponse.json(
        { message: 'No study plan found for user' },
        { status: 404 }
      );
    }

    const semesterMap = new Map<number, { year: number; courses: Array<{ id: string; courseId: string; code: string; title: string; creditHours: number; type: string }> }>();

    plan.items.forEach((item) => {
      const bucket = semesterMap.get(item.semester) ?? { year: item.year, courses: [] };
      bucket.year = item.year;
      bucket.courses.push({
        id: item.id,
        courseId: item.courseId,
        code: item.course?.code ?? '',
        title: item.course?.title ?? '',
        creditHours: item.course?.creditHours ?? 0,
        type: item.course?.department === 'Computer Science' ? 'core' : 'elective',
      });
      semesterMap.set(item.semester, bucket);
    });

    const semesters = Array.from(semesterMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([semesterNumber, data]) => ({
        number: semesterNumber,
        year: data.year,
        courses: data.courses,
      }));

    return NextResponse.json({
      plan: {
        id: plan.id,
        title: plan.title,
        isDefault: plan.isDefault,
        semesters,
      },
      availableCourses: availableCourses.map((course) => ({
        id: course.id,
        code: course.code,
        title: course.title,
        creditHours: course.creditHours,
        department: course.department,
        semester: course.semester,
      })),
    });
  } catch (error) {
    console.error('Study plan GET API error', error);
    return NextResponse.json(
      { message: 'Failed to load study plan' },
      { status: 500 }
    );
  }
}

interface StudyPlanPayload {
  userId?: string;
  planId?: string;
  courseId?: string;
  semester?: number;
  year?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StudyPlanPayload;
    const { userId, planId, courseId, semester, year } = body;

    if (!userId || !planId || !courseId || !semester || !year) {
      return NextResponse.json(
        { message: 'userId, planId, courseId, semester, and year are required' },
        { status: 400 }
      );
    }

    const plan = await prisma.studyPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.userId !== userId) {
      return NextResponse.json(
        { message: 'Study plan not found for user' },
        { status: 404 }
      );
    }

    const existingItem = await prisma.studyPlanItem.findUnique({
      where: {
        studyPlanId_courseId: {
          studyPlanId: planId,
          courseId,
        },
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { message: 'Course already exists in the study plan' },
        { status: 409 }
      );
    }

    const maxOrderItem = await prisma.studyPlanItem.findFirst({
      where: {
        studyPlanId: planId,
        semester,
      },
      orderBy: { order: 'desc' },
    });

    const nextOrder = (maxOrderItem?.order ?? 0) + 1;

    const newItem = await prisma.studyPlanItem.create({
      data: {
        studyPlanId: planId,
        courseId,
        semester,
        year,
        order: nextOrder,
      },
      include: {
        course: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Course added to study plan',
        item: newItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Study plan POST API error', error);
    return NextResponse.json(
      { message: 'Failed to update study plan' },
      { status: 500 }
    );
  }
}
