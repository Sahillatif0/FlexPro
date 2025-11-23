import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminSettings, updateAdminSettings } from "@/lib/admin-settings";
import { ROUTE_DYNAMIC, ROUTE_REVALIDATE, ROUTE_FETCH_CACHE } from "@/lib/route-config";

export const dynamic = ROUTE_DYNAMIC;
export const revalidate = ROUTE_REVALIDATE;
export const fetchCache = ROUTE_FETCH_CACHE;

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    return NextResponse.json(getAdminSettings());
  } catch (error) {
    console.error("Admin settings fetch error", error);
    return NextResponse.json({ message: "Failed to load admin settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const current = getAdminSettings();
    const merged = {
      maintenanceMode:
        typeof body.maintenanceMode === "boolean" ? body.maintenanceMode : current.maintenanceMode,
      enrollmentStatus:
        body.enrollmentStatus === "open" || body.enrollmentStatus === "closed" || body.enrollmentStatus === "waitlist"
          ? body.enrollmentStatus
          : current.enrollmentStatus,
      supportEmail:
        typeof body.supportEmail === "string" && body.supportEmail.trim().length
          ? body.supportEmail.trim()
          : current.supportEmail,
      broadcastMessage:
        typeof body.broadcastMessage === "string" ? body.broadcastMessage : current.broadcastMessage,
      sessionTimeoutMinutes:
        typeof body.sessionTimeoutMinutes === "number" && body.sessionTimeoutMinutes > 0
          ? Math.min(Math.max(Math.round(body.sessionTimeoutMinutes), 5), 240)
          : current.sessionTimeoutMinutes,
    } as const;

    updateAdminSettings(merged);

    return NextResponse.json({ message: "Settings saved", settings: merged });
  } catch (error) {
    console.error("Admin settings update error", error);
    return NextResponse.json({ message: "Unable to update settings" }, { status: 500 });
  }
}
