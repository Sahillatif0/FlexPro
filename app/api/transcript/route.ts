import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const transcripts = await prisma.transcript.findMany({
      where: { userId },
      include: {
        course: true,
        term: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const records = transcripts.map((entry) => ({
      id: entry.id,
      courseCode: entry.course?.code ?? '',
      courseTitle: entry.course?.title ?? '',
      creditHours: entry.course?.creditHours ?? 0,
      grade: entry.grade,
      gradePoints: entry.gradePoints,
      termId: entry.termId,
      term: entry.term?.name ?? null,
      createdAt: entry.createdAt,
    }));

    const totalCreditHours = records.reduce((sum, record) => sum + record.creditHours, 0);
    const totalQualityPoints = records.reduce(
      (sum, record) => sum + record.gradePoints * record.creditHours,
      0
    );
    const cgpa = totalCreditHours ? totalQualityPoints / totalCreditHours : null;

    const termMap = new Map<
      string,
      { name: string | null; credits: number; qualityPoints: number }
    >();

    records.forEach((record) => {
      const key = record.termId ?? record.term ?? 'unknown';
      const bucket = termMap.get(key) ?? {
        name: record.term,
        credits: 0,
        qualityPoints: 0,
      };
      bucket.credits += record.creditHours;
      bucket.qualityPoints += record.gradePoints * record.creditHours;
      termMap.set(key, bucket);
    });

    const termStats = Array.from(termMap.values())
      .filter((term) => term.credits > 0)
      .map((term) => ({
        term: term.name,
        credits: term.credits,
        gpa: term.credits ? term.qualityPoints / term.credits : 0,
      }));

    const termFilters = Array.from(new Set(records.map((record) => record.term).filter(Boolean)));

    return NextResponse.json({
      records,
      summary: {
        cgpa,
        totalCreditHours,
        coursesCompleted: records.length,
        termCount: termFilters.length,
      },
      terms: termFilters,
      termStats,
    });
  } catch (error) {
    console.error('Transcript API error', error);
    return NextResponse.json(
      { message: 'Failed to load transcript data' },
      { status: 500 }
    );
  }
}
