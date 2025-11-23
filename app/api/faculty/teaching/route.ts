import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionFromRequest(request);

    if (!sessionUser) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (sessionUser.role !== "faculty") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const courses = await prisma.course.findMany({
      where: {
        sections: {
          some: {
            instructorId: sessionUser.id,
          },
        },
      },
      include: {
        sections: {
          where: { instructorId: sessionUser.id },
          orderBy: { name: "asc" },
        },
        enrollments: {
          include: {
            user: true,
            term: true,
          },
        },
      },
      orderBy: { code: "asc" },
    } as any);

    const payload = (courses as any[]).map((course: any) => {
      const sectionDefinitions = (course.sections as any[]).map((section: any) => ({
        sectionId: section.id,
        sectionName: section.name,
      }));

      const sectionLookupByName = new Map(
        sectionDefinitions.map((section) => [section.sectionName.trim().toLowerCase(), section])
      );

      const termsMap = new Map<
        string,
        {
          termId: string;
          termName: string;
          sections: Map<
            string,
            {
              sectionId: string;
              sectionName: string;
              students: {
                userId: string;
                studentId: string;
                firstName: string;
                lastName: string;
                email: string;
                sectionName: string | null;
              }[];
            }
          >;
        }
      >();

      const getTermEntry = (enrollment: any) => {
        if (!termsMap.has(enrollment.termId)) {
          const sectionMap = new Map<string, {
            sectionId: string;
            sectionName: string;
            students: {
              userId: string;
              studentId: string;
              firstName: string;
              lastName: string;
              email: string;
              sectionName: string | null;
            }[];
          }>();

          sectionDefinitions.forEach((definition) => {
            sectionMap.set(definition.sectionId, {
              sectionId: definition.sectionId,
              sectionName: definition.sectionName,
              students: [],
            });
          });

          termsMap.set(enrollment.termId, {
            termId: enrollment.termId,
            termName: enrollment.term.name,
            sections: sectionMap,
          });
        }

        return termsMap.get(enrollment.termId)!;
      };

      (course.enrollments as any[]).forEach((enrollment: any) => {
        const termEntry = getTermEntry(enrollment);

        const studentSectionName = typeof enrollment.user.section === "string" ? enrollment.user.section : null;
        const normalizedSectionName = studentSectionName?.trim().toLowerCase() ?? "";
        const matchingSection = normalizedSectionName ? sectionLookupByName.get(normalizedSectionName) : undefined;

        if (!matchingSection && normalizedSectionName) {
          return;
        }

        if (!matchingSection && !termEntry.sections.has("__unassigned__")) {
          termEntry.sections.set("__unassigned__", {
            sectionId: "__unassigned__",
            sectionName: "Unassigned",
            students: [],
          });
        }

        const sectionKey = matchingSection ? matchingSection.sectionId : "__unassigned__";

        if (!termEntry.sections.has(sectionKey)) {
          termEntry.sections.set(sectionKey, {
            sectionId: sectionKey,
            sectionName: matchingSection ? matchingSection.sectionName : "Unassigned",
            students: [],
          });
        }

        const sectionEntry = termEntry.sections.get(sectionKey);
        if (sectionEntry) {
          sectionEntry.students.push({
            userId: enrollment.userId,
            studentId: enrollment.user.studentId,
            firstName: enrollment.user.firstName,
            lastName: enrollment.user.lastName,
            email: enrollment.user.email,
            sectionName: studentSectionName,
          });
        }
      });

      const terms = Array.from(termsMap.values()).map((term) => {
        const sections = Array.from(term.sections.values()).map((section) => ({
          ...section,
          students: section.students.sort((a, b) => a.lastName.localeCompare(b.lastName)),
        }));

        const sortedSections = sections.sort((a, b) => {
          if (a.sectionId === "__unassigned__") return 1;
          if (b.sectionId === "__unassigned__") return -1;
          return a.sectionName.localeCompare(b.sectionName);
        });

        return {
          termId: term.termId,
          termName: term.termName,
          sections: sortedSections,
        };
      });

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
