import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
export { dynamic, revalidate, fetchCache } from "@/lib/route-config";

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
