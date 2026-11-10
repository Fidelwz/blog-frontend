import { ApiError } from "../../lib/api/client.ts";

/** Permission and Origin failures do not mean that an authenticated session expired. */
export function invalidatesSession(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 ||
    (error.status === 403 && error.code === "AccountSuspended"));
}
