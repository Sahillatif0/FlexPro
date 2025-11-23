import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function PATCH(request: Request, { params }: { params: { courseId: string; sectionId: string } }) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { courseId, sectionId } = params;
    if (!courseId || !sectionId) {
      return NextResponse.json({ message: "Course id and section id are required" }, { status: 400 });
    }

    const existingSection = await (prisma as any).courseSection.findFirst({
      where: { id: sectionId, courseId },
    });

    if (!existingSection) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof payload.name === "string") {
      const nextName = payload.name.trim();
      if (!nextName) {
        return NextResponse.json({ message: "Section name cannot be empty" }, { status: 400 });
      }
      if (nextName !== existingSection.name) {
        const duplicate = await (prisma as any).courseSection.findFirst({
          where: {
            courseId,
            name: nextName,
            NOT: { id: sectionId },
          },
        });

        if (duplicate) {
          return NextResponse.json({ message: "Section name already exists for this course" }, { status: 409 });
        }
      }
      updates.name = nextName;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "instructorId")) {
      const instructorValue = payload.instructorId;
      if (typeof instructorValue === "string" && instructorValue.trim().length > 0) {
        const instructorId = instructorValue.trim();
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

        updates.instructorId = instructorId;
      } else if (instructorValue === null || (typeof instructorValue === "string" && instructorValue.trim().length === 0)) {
        updates.instructorId = null;
      } else {
        return NextResponse.json({ message: "Invalid instructor selection" }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No valid fields provided" }, { status: 400 });
    }

    const section = await (prisma as any).courseSection.update({
      where: { id: sectionId },
      data: updates,
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
      message: "Section updated",
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
    console.error("Admin update course section error", error);
    return NextResponse.json({ message: "Unable to update section" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { courseId: string; sectionId: string } }
) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { courseId, sectionId } = params;
    if (!courseId || !sectionId) {
      return NextResponse.json({ message: "Course id and section id are required" }, { status: 400 });
    }

    const section = await (prisma as any).courseSection.findFirst({
      where: {
        id: sectionId,
        courseId,
      },
    });

    if (!section) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    await (prisma as any).courseSection.delete({ where: { id: sectionId } });

    return NextResponse.json({ message: "Section removed" });
  } catch (error) {
    console.error("Admin delete course section error", error);
    return NextResponse.json({ message: "Unable to remove section" }, { status: 500 });
  }
}
