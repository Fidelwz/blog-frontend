import { getCategories } from "@/features/publications/server";
import { json, errorResponse } from "@/features/auth/server/handlers";
export const runtime = "nodejs";
export async function GET() {
  try { return json(await getCategories()); } catch (error) { return errorResponse(error); }
}
