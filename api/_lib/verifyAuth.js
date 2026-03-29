import { createClient } from "@supabase/supabase-js";

/**
 * Verifies the Bearer token in the Authorization header and optionally checks
 * that the authenticated user matches an expected userId.
 *
 * Returns { user } on success, or { error } on failure.
 */
export async function verifyAuth(req, expectedUserId) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { error: "Unauthorized" };

  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: { user }, error } = await admin.auth.getUser(token);

  if (error || !user) return { error: "Unauthorized" };
  if (expectedUserId && user.id !== expectedUserId) return { error: "Forbidden" };

  return { user };
}
