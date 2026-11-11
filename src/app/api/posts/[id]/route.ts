export const runtime = "nodejs";
export { readPost as GET, updatePost as PATCH, deletePost as DELETE } from "@/features/publications/write-handlers";
