import type { Profile, ProfilePatch } from "./types.ts";

export const profileFields = ["firstName", "lastName", "major", "university", "bio"] as const;
export type ProfileValues = Record<typeof profileFields[number], string>;
const limits = { firstName: 80, lastName: 80, major: 100, university: 120, bio: 500 };
export function profileValues(profile: Profile): ProfileValues {
  return { firstName: profile.firstName, lastName: profile.lastName, major: profile.major ?? "",
    university: profile.university ?? "", bio: profile.bio ?? "" };
}
export function validateProfile(values: ProfileValues) {
  const errors: Partial<Record<keyof ProfileValues, string>> = {};
  for (const field of profileFields) {
    const value = values[field].trim();
    if ((field === "firstName" || field === "lastName") && value.length < 2) errors[field] = "Escribe entre 2 y 80 caracteres.";
    if (value.length > limits[field]) errors[field] = `El máximo es de ${limits[field]} caracteres.`;
  }
  return errors;
}
export function buildProfilePatch(baseline: ProfileValues, values: ProfileValues): ProfilePatch {
  if (Object.keys(validateProfile(values)).length) throw new Error("Invalid profile changes");
  const patch: ProfilePatch = {};
  for (const field of profileFields) {
    const value = values[field].trim();
    if (value === baseline[field].trim()) continue;
    if (field === "firstName" || field === "lastName") patch[field] = value;
    else patch[field] = value || null;
  }
  return patch;
}
export function parseProfilePatch(value: Record<string, unknown>): ProfilePatch {
  if (!Object.keys(value).length || Object.keys(value).some(k => !profileFields.includes(k as keyof ProfileValues))) throw new Error("Invalid profile changes");
  const patch: ProfilePatch = {};
  for (const field of profileFields) {
    if (!Object.hasOwn(value, field)) continue;
    const v = value[field];
    if (field === "firstName" || field === "lastName") {
      if (typeof v !== "string" || v.trim().length < 2 || v.trim().length > 80) throw new Error("Invalid name");
      patch[field] = v.trim();
    } else {
      if (v !== null && (typeof v !== "string" || v.trim().length > limits[field])) throw new Error("Invalid profile field");
      patch[field] = typeof v === "string" ? v.trim() || null : null;
    }
  }
  return patch;
}
