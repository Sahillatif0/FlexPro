import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

type MaybeRecord = Record<string, unknown> | null | undefined;

const formatFacultyName = (user: MaybeRecord): string | null => {
  if (!user) {
    return null;
  }
  const first = typeof user?.firstName === 'string' ? (user.firstName as string) : '';
  const last = typeof user?.lastName === 'string' ? (user.lastName as string) : '';
  const combined = `${first} ${last}`.trim();
  return combined.length ? combined : null;
};

const resolveFaculty = (
  sections: Array<MaybeRecord>,
  studentSection?: string | null,
  explicitFaculty?: MaybeRecord,
  explicitFacultyId?: string | null
) => {
  if (explicitFacultyId || explicitFaculty) {
    const facultyRecord = explicitFaculty ?? ({} as MaybeRecord);
    return {
      facultyId: explicitFacultyId ?? (facultyRecord?.id as string | null | undefined) ?? null,
      facultyName: formatFacultyName(facultyRecord),
    };
  }

  const normalizedSection = studentSection?.trim().toLowerCase();
  const matchedSection = normalizedSection
    ? sections.find((section) =>
        typeof section?.name === 'string' &&
        (section.name as string).trim().toLowerCase() === normalizedSection
      )
    : undefined;
  const fallbackSection = matchedSection ?? sections.find((section) => !!section?.instructorId);
  const instructor = fallbackSection?.instructor as MaybeRecord | undefined;

  return {
    facultyId:
      (fallbackSection?.instructorId as string | null | undefined) ??
      (instructor?.id as string | null | undefined) ??
      null,
    facultyName: formatFacultyName(instructor ?? null),
  };
};

const feedbackPostSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  termId: z.string().min(1, 'termId is required'),
  rating: z.coerce.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().max(500, 'Comment must be 500 characters or less').optional().nullable(),
  anonymous: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
  facultyId: z.string().min(1).optional().nullable(),
});

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

    const [enrollments, feedbackEntries] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              sections: {
                include: {
                  instructor: true,
                },
              },
            },
          },
          term: true,
          user: {
            select: {
              section: true,
            },
          },
        },
      }),
      (prisma.feedback as any).findMany({
        where: { userId },
        include: {
          course: {
            include: {
              sections: {
                include: {
                  instructor: true,
                },
              },
            },
          },
          term: true,
          faculty: true,
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    const enrollmentRecords = enrollments;
    const feedbackRecords = feedbackEntries as Array<any>;

    const pendingFeedback = enrollmentRecords
      .filter((enrollment) =>
        !feedbackRecords.some(
          (feedback) =>
            feedback.courseId === enrollment.courseId &&
            feedback.termId === enrollment.termId
        )
      )
      .map((enrollment) => {
        const sections = (enrollment.course?.sections ?? []) as Array<MaybeRecord>;
        const { facultyId, facultyName } = resolveFaculty(
          sections,
          enrollment.user?.section ?? null
        );

        return {
          courseId: enrollment.courseId,
          enrollmentId: enrollment.id,
          code: enrollment.course.code,
          title: enrollment.course.title,
          facultyId,
          facultyName,
          instructor: facultyName || enrollment.course.description || 'Faculty',
          termId: enrollment.termId,
          term: enrollment.term?.name ?? null,
        };
      });

    const submittedFeedback = feedbackRecords.map((feedback) => {
      const sections = (feedback.course?.sections ?? []) as Array<MaybeRecord>;
      const { facultyId, facultyName } = resolveFaculty(
        sections,
        undefined,
        feedback.faculty as MaybeRecord,
        feedback.facultyId ?? null
      );

      return {
        id: feedback.id,
        courseId: feedback.courseId,
        code: feedback.course?.code ?? '',
        title: feedback.course?.title ?? '',
        termId: feedback.termId,
        term: feedback.term?.name ?? null,
        rating: feedback.rating,
        comment: feedback.comment ?? '',
        facultyId,
        facultyName,
        submittedAt:
          feedback.submittedAt instanceof Date
            ? feedback.submittedAt.toISOString()
            : feedback.submittedAt,
      };
    });

    const averageRating = submittedFeedback.length
      ? submittedFeedback.reduce((sum, item) => sum + item.rating, 0) /
        submittedFeedback.length
      : null;

    return NextResponse.json({
      pendingFeedback,
      submittedFeedback,
      summary: {
        pendingCount: pendingFeedback.length,
        submittedCount: submittedFeedback.length,
        averageRating,
      },
    });
  } catch (error) {
    console.error('Feedback GET API error', error);
    return NextResponse.json(
      { message: 'Failed to load feedback data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionFromRequest(request);
    const userId = sessionUser?.id;

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsedBody = feedbackPostSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      const errorDetails = parsedBody.error.flatten();
      return NextResponse.json(
        {
          message: 'Invalid feedback submission payload',
          errors: errorDetails.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { courseId, termId, rating, comment, anonymous, isAnonymous, facultyId } =
      parsedBody.data;
    const finalAnonymous = anonymous ?? isAnonymous ?? true;

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, courseId, termId },
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
                  },
                },
              },
            },
          },
        },
        term: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            section: true,
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { message: 'You are not enrolled in this course for the selected term.' },
        { status: 404 }
      );
    }

    const explicitFaculty = facultyId
      ? await prisma.user.findUnique({
          where: { id: facultyId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        })
      : null;

    if (facultyId && !explicitFaculty) {
      return NextResponse.json(
        { message: 'Instructor not found for provided facultyId.' },
        { status: 400 }
      );
    }

    const { facultyId: resolvedFacultyId, facultyName } = resolveFaculty(
      (enrollment.course.sections ?? []) as Array<MaybeRecord>,
      enrollment.user?.section ?? null,
      explicitFaculty as MaybeRecord,
      explicitFaculty?.id ?? facultyId ?? null
    );

    if (!resolvedFacultyId) {
      return NextResponse.json(
        { message: 'No instructor assigned to this course section yet.' },
        { status: 400 }
      );
    }

    const sanitizedComment =
      typeof comment === 'string' && comment.trim().length ? comment.trim() : null;

    const feedback = await (prisma.feedback as any).upsert({
      where: {
        userId_courseId_termId: {
          userId,
          courseId,
          termId,
        },
      },
      update: {
        rating,
        comment: sanitizedComment,
        isAnonymous: finalAnonymous,
        facultyId: resolvedFacultyId,
        submittedAt: new Date(),
      },
      create: {
        userId,
        courseId,
        termId,
        rating,
        comment: sanitizedComment,
        isAnonymous: finalAnonymous,
        facultyId: resolvedFacultyId,
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
        term: {
          select: {
            id: true,
            name: true,
          },
        },
        faculty: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Feedback submitted successfully.',
        feedback: {
          id: feedback.id,
          courseId: feedback.courseId,
          termId: feedback.termId,
          rating: feedback.rating,
          comment: feedback.comment ?? '',
          isAnonymous: feedback.isAnonymous,
          facultyId: feedback.facultyId,
          facultyName:
            formatFacultyName(feedback.faculty as MaybeRecord) ?? facultyName ?? null,
          submittedAt:
            feedback.submittedAt instanceof Date
              ? feedback.submittedAt.toISOString()
              : feedback.submittedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Feedback POST API error', error);
    return NextResponse.json(
      { message: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
