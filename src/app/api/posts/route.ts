import { getPublicFeed } from "@/features/publications/server";
import { json, errorResponse } from "@/features/auth/server/handlers";
export const runtime = "nodejs";
export { createPost as POST } from "@/features/publications/write-handlers";
export async function GET(request: Request) {
  try { return json(await getPublicFeed(new URL(request.url).searchParams, request.signal)); }
  catch (error) { return errorResponse(error); }
}
