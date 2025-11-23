import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const ALLOWED_STATUSES = ["pending", "approved", "rejected"] as const;
const STATUS_SET = new Set(ALLOWED_STATUSES);

interface UpdatePayload {
  status?: string;
  notes?: string | null;
}

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionFromRequest(request);

    if (!sessionUser) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (sessionUser.role !== "faculty") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const requestId = params?.id;
    if (!requestId) {
      return NextResponse.json({ message: "Request id is required" }, { status: 400 });
    }

    const payload = (await request.json().catch(() => null)) as UpdatePayload | null;
    const nextStatus = payload?.status;
    const rawNotes = typeof payload?.notes === "string" ? payload.notes.trim() : null;
    const notes = rawNotes && rawNotes.length > 0 ? rawNotes : null;

    if (!nextStatus || !STATUS_SET.has(nextStatus as AllowedStatus)) {
      return NextResponse.json(
        { message: "A valid status value is required" },
        { status: 400 }
      );
    }

    const gradeRequest = await prisma.gradeRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
      },
    });

    if (!gradeRequest) {
      return NextResponse.json({ message: "Grade request not found" }, { status: 404 });
    }

    const course = await prisma.course.findFirst({
      where: {
        code: gradeRequest.courseCode,
        sections: {
          some: {
            instructorId: sessionUser.id,
          },
        },
      },
      include: {
        sections: {
          where: {
            instructorId: sessionUser.id,
          },
          select: {
            name: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const sectionNames = Array.isArray((course as any).sections)
      ? ((course as any).sections as Array<{ name: string | null }>)
          .map((section) => (section?.name ?? "").trim().toLowerCase())
          .filter((name) => name.length > 0)
      : [];

    if (sectionNames.length) {
      const normalizedStudentSection = (gradeRequest.user?.section ?? "").trim().toLowerCase();
      if (normalizedStudentSection && !sectionNames.includes(normalizedStudentSection)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const updated = await prisma.gradeRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus as AllowedStatus,
        adminNotes: notes,
        reviewedAt: nextStatus === "pending" ? null : new Date(),
      },
    });

    // If approved, also apply the requested grade to the student's transcript
    if (nextStatus === 'approved') {
      try {
        const courseRecord = await prisma.course.findFirst({ where: { code: gradeRequest.courseCode } });
        if (courseRecord) {
          const gradeToPoints = (grade: string) => {
            const normalized = (grade || '').trim().toUpperCase();
            const map: Record<string, number> = {
              'A+': 4.0,
              'A': 4.0,
              'A-': 3.67,
              'B+': 3.33,
              'B': 3.0,
              'B-': 2.67,
              'C+': 2.33,
              'C': 2.0,
              'C-': 1.67,
              'D': 1.0,
              'F': 0.0,
            };

            return typeof map[normalized] === 'number' ? map[normalized] : 0.0;
          };

          const points = gradeToPoints(updated.requestedGrade || 'F');

          // Upsert final transcript entry (create if none, otherwise update)
          await prisma.transcript.upsert({
            where: {
              userId_courseId_termId_status: {
                userId: updated.userId,
                courseId: courseRecord.id,
                termId: updated.termId,
                status: 'final',
              },
            },
            update: {
              grade: updated.requestedGrade,
              gradePoints: points,
            },
            create: {
              userId: updated.userId,
              courseId: courseRecord.id,
              termId: updated.termId,
              grade: updated.requestedGrade,
              gradePoints: points,
              status: 'final',
            },
          });
        }
      } catch (e) {
        console.error('Failed to apply approved grade to transcript', e);
      }
    }

    return NextResponse.json({
      message: "Grade request updated",
      gradeRequest: {
        id: updated.id,
        status: updated.status,
        notes: updated.adminNotes,
        reviewedAt: updated.reviewedAt,
      },
    });
  } catch (error) {
    console.error("Faculty grade request update failed", error);
    return NextResponse.json(
      { message: "Failed to update grade request" },
      { status: 500 }
    );
  }
}
