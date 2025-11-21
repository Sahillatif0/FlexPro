import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";

export async function GET() {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const sessionUser = await getSessionFromToken(token);

    if (!sessionUser) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (sessionUser.role !== "faculty") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const courses = await prisma.course.findMany({
      where: { instructorId: sessionUser.id } as any,
      include: {
        enrollments: {
          include: {
            user: true,
            term: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const payload = (courses as any[]).map((course: any) => {
      const termsMap = new Map<string, {
        termId: string;
        termName: string;
        students: {
          userId: string;
          studentId: string;
          firstName: string;
          lastName: string;
          email: string;
        }[];
      }>();

      (course.enrollments as any[]).forEach((enrollment: any) => {
        const key = enrollment.termId;
        if (!termsMap.has(key)) {
          termsMap.set(key, {
            termId: enrollment.termId,
            termName: enrollment.term.name,
            students: [],
          });
        }

        const entry = termsMap.get(key);
        if (entry) {
          entry.students.push({
            userId: enrollment.userId,
            studentId: enrollment.user.studentId,
            firstName: enrollment.user.firstName,
            lastName: enrollment.user.lastName,
            email: enrollment.user.email,
          });
        }
      });

      const terms = Array.from(termsMap.values()).map((term) => ({
        ...term,
        students: term.students.sort((a, b) => a.lastName.localeCompare(b.lastName)),
      }));

      return {
        courseId: course.id,
        code: course.code,
        title: course.title,
        terms: terms.sort((a, b) => a.termName.localeCompare(b.termName)),
      };
    });

    return NextResponse.json({ courses: payload });
  } catch (error) {
    console.error("Faculty teaching lookup failed", error);
    return NextResponse.json({ message: "Failed to load teaching assignments" }, { status: 500 });
  }
}
