import "server-only";

import { adminAuth } from "@/lib/firebase-admin";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the bearer token on a request and returns the caller's uid.
 * Mirrors `requireStaffOrAdmin`, minus the role check.
 */
export async function requireUser(request: Request): Promise<{ uid: string }> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    throw new ApiError(401, "You must be signed in.");
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    throw new ApiError(401, "Your session has expired — sign in again.");
  }
}
