import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ROUTE_DYNAMIC, ROUTE_REVALIDATE, ROUTE_FETCH_CACHE } from "@/lib/route-config";

export const dynamic = ROUTE_DYNAMIC;
export const revalidate = ROUTE_REVALIDATE;
export const fetchCache = ROUTE_FETCH_CACHE;

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
