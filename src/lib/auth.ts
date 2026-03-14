import { createClient } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase-server";

export type ProfileRole = "admin" | "user";

export interface CurrentUser {
  id: string;
  email: string;
  role: ProfileRole;
}

/** Get current user and profile (role). Returns null if not authenticated. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  // Use service role to read profile so RLS/cache never hides admin role
  const adminClient = getSupabase();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role === "admin" ? "admin" : "user") as ProfileRole;
  return {
    id: user.id,
    email: user.email,
    role,
  };
}
