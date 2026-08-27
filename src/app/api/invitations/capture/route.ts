import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const token =
    body && typeof body === "object" && "token" in body ? Reflect.get(body, "token") : null;

  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
  }

  const response = NextResponse.json({ captured: true });
  response.cookies.set("recia_invitation", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
