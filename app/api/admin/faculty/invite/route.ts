import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ROUTE_DYNAMIC, ROUTE_REVALIDATE, ROUTE_FETCH_CACHE } from "@/lib/route-config";

export const dynamic = ROUTE_DYNAMIC;
export const revalidate = ROUTE_REVALIDATE;
export const fetchCache = ROUTE_FETCH_CACHE;

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    // Placeholder for future email delivery integration.
    return NextResponse.json({ message: "Faculty invitation workflow queued." });
  } catch (error) {
    console.error("Admin faculty invite error", error);
    return NextResponse.json({ message: "Unable to send invite" }, { status: 500 });
  }
}
