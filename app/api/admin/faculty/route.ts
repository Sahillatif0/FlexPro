import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
export { dynamic, revalidate, fetchCache } from "@/lib/route-config";

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100;

    const facultyMembers = (await prisma.user.findMany({
      where: { role: "faculty" },
      orderBy: { createdAt: "desc" },
      take: limit,
    })) as any[];

    const facultyIds = facultyMembers.map((member) => member.id);

    if (!facultyIds.length) {
      return NextResponse.json({ faculty: [] });
    }

    const sectionAssignments = (await (prisma as any).courseSection.findMany({
      where: { instructorId: { in: facultyIds } },
      select: { instructorId: true },
    })) as any[];

    const countsLookup = sectionAssignments.reduce<Record<string, number>>((acc, section) => {
      if (section.instructorId) {
        acc[section.instructorId] = (acc[section.instructorId] ?? 0) + 1;
      }
      return acc;
    }, {});

    return NextResponse.json({
      faculty: facultyMembers.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        employeeId: member.employeeId ?? null,
        department: member.program ?? null,
        totalSections: countsLookup[member.id] ?? 0,
        isActive: member.isActive,
        joinedAt: member.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Admin faculty fetch error", error);
    return NextResponse.json({ message: "Failed to load faculty" }, { status: 500 });
  }
}
