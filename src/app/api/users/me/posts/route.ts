import type { NextRequest } from "next/server";
import { getMyPosts } from "@/features/publications/my-server";
import { SESSION_COOKIE, validCookieValue } from "@/features/auth/server/cookie";
import { authError } from "@/features/auth/server/backend";
import { json, errorResponse } from "@/features/auth/server/handlers";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie || !validCookieValue(cookie)) throw authError(401, "Inicia sesión para continuar.");
    return json(await getMyPosts(request.nextUrl.searchParams, cookie, request.signal));
  } catch (error) { return errorResponse(error, true); }
}
