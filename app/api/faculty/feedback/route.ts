import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type FeedbackItem = {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  termId: string | null;
  termName: string | null;
  rating: number;
  comment: string;
  submittedAt: string;
};

type CourseStat = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  totalResponses: number;
  averageRating: number;
  latestFeedbackAt: string;
};

type RatingBucket = {
  rating: number;
  count: number;
};

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionFromRequest(request);

    if (!sessionUser) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (sessionUser.role !== "faculty") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const feedbackEntries = await prisma.feedback.findMany({
      where: {
        isAnonymous: true,
        course: {
          sections: {
            some: {
              instructorId: sessionUser.id,
            },
          },
        },
      },
      include: {
        course: true,
        term: true,
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    if (!feedbackEntries.length) {
      return NextResponse.json({
        feedback: [] as FeedbackItem[],
        summary: {
          total: 0,
          averageRating: null as number | null,
          positiveCount: 0,
          needsAttention: 0,
        },
        courseStats: [] as CourseStat[],
        ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 })) as RatingBucket[],
        filters: {
          courses: [] as Array<{ courseId: string; courseCode: string; courseTitle: string }>,
          terms: [] as Array<{ id: string; name: string }>,
          ratings: [1, 2, 3, 4, 5],
        },
      });
    }

    const courseStatMap = new Map<string, {
      courseId: string;
      courseCode: string;
      courseTitle: string;
      total: number;
      ratingSum: number;
      latest: string;
    }>();

    const termMap = new Map<string, { id: string; name: string }>();
    const ratingCount = new Map<number, number>();
    let ratingSum = 0;

    const feedback: FeedbackItem[] = feedbackEntries.map((entry) => {
      const courseId = entry.courseId;
      const courseCode = entry.course?.code ?? "";
      const courseTitle = entry.course?.title ?? "Untitled Course";
      const submittedAt = entry.submittedAt.toISOString();
      const rating = entry.rating;

      ratingSum += rating;
      ratingCount.set(rating, (ratingCount.get(rating) ?? 0) + 1);

      if (entry.termId && entry.term?.name && !termMap.has(entry.termId)) {
        termMap.set(entry.termId, { id: entry.termId, name: entry.term.name });
      }

      const existing = courseStatMap.get(courseId);
      if (existing) {
        existing.total += 1;
        existing.ratingSum += rating;
        if (existing.latest < submittedAt) {
          existing.latest = submittedAt;
        }
      } else {
        courseStatMap.set(courseId, {
          courseId,
          courseCode,
          courseTitle,
          total: 1,
          ratingSum: rating,
          latest: submittedAt,
        });
      }

      return {
        id: entry.id,
        courseId,
        courseCode,
        courseTitle,
        termId: entry.termId,
        termName: entry.term?.name ?? null,
        rating,
        comment: entry.comment ?? "",
        submittedAt,
      };
    });

    const total = feedback.length;
    const averageRating = total ? Number((ratingSum / total).toFixed(2)) : null;
    const positiveCount = feedback.filter((item) => item.rating >= 4).length;
    const needsAttention = feedback.filter((item) => item.rating <= 2).length;

    const courseStats: CourseStat[] = Array.from(courseStatMap.values())
      .map((stat) => ({
        courseId: stat.courseId,
        courseCode: stat.courseCode,
        courseTitle: stat.courseTitle,
        totalResponses: stat.total,
        averageRating: Number((stat.ratingSum / stat.total).toFixed(2)),
        latestFeedbackAt: stat.latest,
      }))
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));

    const ratingDistribution: RatingBucket[] = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: ratingCount.get(rating) ?? 0,
    }));

    const courseFilters = courseStats.map((stat) => ({
      courseId: stat.courseId,
      courseCode: stat.courseCode,
      courseTitle: stat.courseTitle,
    }));

    return NextResponse.json({
      feedback,
      summary: {
        total,
        averageRating,
        positiveCount,
        needsAttention,
      },
      courseStats,
      ratingDistribution,
      filters: {
        courses: courseFilters,
        terms: Array.from(termMap.values()),
        ratings: [1, 2, 3, 4, 5],
      },
    });
  } catch (error) {
    console.error("Faculty anonymous feedback fetch failed", error);
    return NextResponse.json(
      { message: "Failed to load feedback" },
      { status: 500 }
    );
  }
}
