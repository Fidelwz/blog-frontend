import type { AuthUser } from "../auth/types.ts";

export interface PublicProfile {
  id: number;
  firstName: string;
  lastName: string;
  major: string | null;
  university: string | null;
  bio: string | null;
  photoUrl: string | null;
  role: AuthUser["role"];
  registeredAt: string;
  _count: { posts: number; groups: number };
}
export interface Profile extends PublicProfile {
  email: string;
  status: AuthUser["status"];
}
export type ProfilePatch = Partial<Pick<Profile, "firstName" | "lastName" | "major" | "university" | "bio">>;

export function parsePublicProfile(value: unknown): PublicProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid profile");
  const p = value as Record<string, unknown>;
  const counts = p._count as Record<string, unknown> | undefined;
  if (!Number.isSafeInteger(p.id) || Number(p.id) < 1 || typeof p.firstName !== "string" || typeof p.lastName !== "string" ||
      ![p.major, p.university, p.bio, p.photoUrl].every(v => v === null || typeof v === "string") ||
      (p.role !== "usuario" && p.role !== "administrador") ||
      typeof p.registeredAt !== "string" || !Number.isFinite(Date.parse(p.registeredAt)) ||
      !counts || !Number.isSafeInteger(counts.posts) || Number(counts.posts) < 0 || !Number.isSafeInteger(counts.groups) || Number(counts.groups) < 0) {
    throw new Error("Invalid profile");
  }
  if (typeof p.photoUrl === "string") {
    const url = new URL(p.photoUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid photo URL");
  }
  return { id: p.id as number, firstName: p.firstName, lastName: p.lastName, major: p.major as string | null,
    university: p.university as string | null, bio: p.bio as string | null, photoUrl: p.photoUrl as string | null,
    role: p.role, registeredAt: p.registeredAt, _count: { posts: counts.posts as number, groups: counts.groups as number } };
}

export function parseProfile(value: unknown): Profile {
  const profile = parsePublicProfile(value);
  const p = value as Record<string, unknown>;
  if (typeof p.email !== "string" || (p.status !== "activo" && p.status !== "suspendido")) throw new Error("Invalid profile");
  return { ...profile, email: p.email, status: p.status };
}
