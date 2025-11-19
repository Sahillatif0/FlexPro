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

    const [enrollments, feedbackEntries] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: true,
          term: true,
        },
      }),
      prisma.feedback.findMany({
        where: { userId },
        include: {
          course: true,
          term: true,
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    const pendingFeedback = enrollments
      .filter((enrollment) =>
        !feedbackEntries.some(
          (feedback) =>
            feedback.courseId === enrollment.courseId &&
            feedback.termId === enrollment.termId
        )
      )
      .map((enrollment) => ({
        courseId: enrollment.courseId,
        enrollmentId: enrollment.id,
        code: enrollment.course.code,
        title: enrollment.course.title,
        instructor: enrollment.course.description ?? 'Faculty',
        termId: enrollment.termId,
        term: enrollment.term?.name ?? null,
      }));

    const submittedFeedback = feedbackEntries.map((feedback) => ({
      id: feedback.id,
      courseId: feedback.courseId,
      code: feedback.course?.code ?? '',
      title: feedback.course?.title ?? '',
      termId: feedback.termId,
      term: feedback.term?.name ?? null,
      rating: feedback.rating,
      comment: feedback.comment ?? '',
      submittedAt: feedback.submittedAt,
    }));

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

interface FeedbackPayload {
  userId?: string;
  courseId?: string;
  termId?: string;
  rating?: number;
  comment?: string;
  isAnonymous?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackPayload;
    const { userId, courseId, termId, rating, comment, isAnonymous = false } = body;

    if (!userId || !courseId || !termId || typeof rating === 'undefined') {
      return NextResponse.json(
        { message: 'userId, courseId, termId, and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const feedback = await prisma.feedback.upsert({
      where: {
        userId_courseId_termId: {
          userId,
          courseId,
          termId,
        },
      },
      update: {
        rating,
        comment: comment ?? null,
        isAnonymous,
      },
      create: {
        userId,
        courseId,
        termId,
        rating,
        comment: comment ?? null,
        isAnonymous,
      },
      include: {
        course: true,
        term: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Feedback submitted successfully',
        feedback,
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
