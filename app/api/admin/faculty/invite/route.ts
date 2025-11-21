import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";

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

export async function POST() {
  try {
    const session = await requireAdminSession();
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
