import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";
import { adminNotificationSchema } from "@/lib/validation/admin";

async function requireAdminSession() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const sessionUser = await getSessionFromToken(token);
  if (!sessionUser) {
    return { status: 401 as const, message: "Not authenticated" };
  }
  if (sessionUser.role !== "admin") {
    return { status: 403 as const, message: "Forbidden" };
  }
  return { status: 200 as const };
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    if (session.status !== 200) {
      return NextResponse.json({ message: session.message }, { status: session.status });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = adminNotificationSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    const roles = data.audience === "all"
      ? ["student", "faculty"]
      : data.audience === "students"
      ? ["student"]
      : ["faculty"];

    const recipients = await prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });

    if (!recipients.length) {
      return NextResponse.json({ message: "No active recipients for the selected audience" }, { status: 404 });
    }

    await prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.id,
        title: data.title,
        message: data.message,
        type: data.type,
        isGlobal: data.audience === "all",
      })),
    });

    return NextResponse.json({
      message: `Notification sent to ${recipients.length} ${data.audience === "all" ? "users" : data.audience}`,
      recipients: recipients.length,
    });
  } catch (error) {
    console.error("Admin notify error", error);
    return NextResponse.json({ message: "Unable to send notification" }, { status: 500 });
  }
}
