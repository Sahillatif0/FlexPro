import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ROUTE_DYNAMIC, ROUTE_REVALIDATE, ROUTE_FETCH_CACHE } from "@/lib/route-config";

export const dynamic = ROUTE_DYNAMIC;
export const revalidate = ROUTE_REVALIDATE;
export const fetchCache = ROUTE_FETCH_CACHE;

export async function POST(request: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { courseId } = params;
    if (!courseId) {
      return NextResponse.json({ message: "Course id is required" }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    const hasInstructor = Object.prototype.hasOwnProperty.call(payload ?? {}, "instructorId");
    const instructorValue = payload?.instructorId;
    let instructorId: string | null | undefined;

    if (hasInstructor) {
      if (typeof instructorValue === "string" && instructorValue.trim().length > 0) {
        instructorId = instructorValue.trim();
        const instructorExists = await prisma.user.findFirst({
          where: {
            id: instructorId,
            role: "faculty",
            isActive: true,
          },
        });

        if (!instructorExists) {
          return NextResponse.json({ message: "Instructor not found" }, { status: 400 });
        }
      } else if (instructorValue === null) {
        instructorId = null;
      } else {
        instructorId = null;
      }
    }

    if (!name) {
      return NextResponse.json({ message: "Section name is required" }, { status: 400 });
    }

    const courseExists = await prisma.course.findUnique({ where: { id: courseId } });
    if (!courseExists) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const section = await (prisma as any).courseSection.upsert({
      where: {
        courseId_name: {
          courseId,
          name,
        },
      },
      update: instructorId !== undefined ? { instructorId } : {},
      create: {
        courseId,
        name,
        instructorId: instructorId ?? null,
      },
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
    });

    return NextResponse.json({
      message: "Section added",
      section: {
        id: section.id,
        name: section.name,
        instructor: section.instructor
          ? {
              id: section.instructor.id,
              firstName: section.instructor.firstName,
              lastName: section.instructor.lastName,
              employeeId: section.instructor.employeeId ?? null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Admin add course section error", error);
    return NextResponse.json({ message: "Unable to add section" }, { status: 500 });
  }
}
