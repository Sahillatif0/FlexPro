import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
export { dynamic, revalidate, fetchCache } from "@/lib/route-config";
import { adminCourseUpdateSchema } from "@/lib/validation/course";
import { Prisma } from "@prisma/client";

const instructorSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  firstName: true,
  lastName: true,
  employeeId: true,
});

const courseSectionSelect = Prisma.validator<Prisma.CourseSectionSelect>()({
  id: true,
  name: true,
  instructor: {
    select: instructorSelect,
  },
});

const courseSelect = Prisma.validator<Prisma.CourseSelect>()({
  id: true,
  code: true,
  title: true,
  description: true,
  department: true,
  creditHours: true,
  semester: true,
  maxCapacity: true,
  isActive: true,
  prerequisite: true,
  createdAt: true,
  updatedAt: true,
  sections: {
    orderBy: { name: "asc" },
    select: courseSectionSelect,
  },
});

type CourseRecord = Prisma.CourseGetPayload<{ select: typeof courseSelect }>;

function mapCourse(course: CourseRecord) {
  return {
    id: course.id,
    code: course.code,
    title: course.title,
    description: course.description ?? null,
    department: course.department,
    creditHours: course.creditHours,
    semester: course.semester,
    maxCapacity: course.maxCapacity,
    isActive: course.isActive,
    prerequisite: course.prerequisite ?? null,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    sections: (course.sections ?? []).map((section) => ({
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
    })),
  };
}

export async function GET(request: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { courseId } = params;
    if (!courseId) {
      return NextResponse.json({ message: "Course id is required" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: courseSelect,
    });

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ course: mapCourse(course) });
  } catch (error) {
    console.error("Admin fetch course error", error);
    return NextResponse.json({ message: "Unable to load course" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { courseId: string } }) {
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
    if (!payload) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = adminCourseUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    const courseExists = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!courseExists) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const updateData: Prisma.CourseUpdateInput = {};

    if (data.title) updateData.title = data.title;
    if (data.department) updateData.department = data.department;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.prerequisite !== undefined) updateData.prerequisite = data.prerequisite;
    if (data.creditHours !== undefined) updateData.creditHours = data.creditHours;
    if (data.semester !== undefined) updateData.semester = data.semester;
    if (data.maxCapacity !== undefined) updateData.maxCapacity = data.maxCapacity;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No valid fields provided" }, { status: 400 });
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: updateData,
      select: courseSelect,
    });

    return NextResponse.json({ message: "Course updated", course: mapCourse(course) });
  } catch (error) {
    console.error("Admin update course error", error);
    return NextResponse.json({ message: "Unable to update course" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { courseId } = params;
    if (!courseId) {
      return NextResponse.json({ message: "Course id is required" }, { status: 400 });
    }

    await prisma.course.delete({ where: { id: courseId } });
    return NextResponse.json({ message: "Course deleted" });
  } catch (error) {
    console.error("Admin delete course error", error);
    return NextResponse.json({ message: "Unable to delete course" }, { status: 500 });
  }
}
