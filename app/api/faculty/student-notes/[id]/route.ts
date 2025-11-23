import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ROUTE_DYNAMIC, ROUTE_REVALIDATE, ROUTE_FETCH_CACHE } from "@/lib/route-config";

export const dynamic = ROUTE_DYNAMIC;
export const revalidate = ROUTE_REVALIDATE;
export const fetchCache = ROUTE_FETCH_CACHE;

export async function PUT(
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

    const noteId = params.id;
    if (!noteId) {
      return NextResponse.json({ message: "Note id is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const title = body?.title as string | undefined;
    const content = body?.content as string | undefined;

    if (!title || !content) {
      return NextResponse.json({ message: "title and content are required" }, { status: 400 });
    }

    const existing = await (prisma as any).studentNote.findUnique({
      where: { id: noteId },
    });

    if (!existing || existing.facultyId !== sessionUser.id) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    const updated = await (prisma as any).studentNote.update({
      where: { id: noteId },
      data: {
        title,
        content,
      },
    });

    return NextResponse.json({ message: "Note updated", noteId: updated.id });
  } catch (error) {
    console.error("Faculty student note update failed", error);
    return NextResponse.json({ message: "Failed to update note" }, { status: 500 });
  }
}
