"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase-server";

export type ProfileRole = "admin" | "user";

/** Invite a user by email; they receive a login link. Admin only. */
export async function inviteUser(email: string, role: ProfileRole = "user") {
  const current = await getCurrentUser();
  if (!current || current.role !== "admin") {
    throw new Error("Forbidden");
  }

  const supabase = getSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  // Store intended role so trigger can set it when they accept the invite
  const { error: insertError } = await supabase.from("pending_invites").upsert(
    { email: normalizedEmail, role },
    { onConflict: "email" }
  );
  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    normalizedEmail
  );
  if (inviteError) {
    // Remove pending invite if invite failed (e.g. already a user)
    await supabase.from("pending_invites").delete().eq("email", normalizedEmail);
    throw new Error(inviteError.message);
  }

  revalidatePath("/admin/users");
}

/** Update a user's role. Admin only. */
export async function updateUserRole(userId: string, role: ProfileRole) {
  const current = await getCurrentUser();
  if (!current || current.role !== "admin") {
    throw new Error("Forbidden");
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/admin/users");
}

/** Remove a user's access (delete from auth). Admin only. */
export async function removeUserAccess(userId: string) {
  const current = await getCurrentUser();
  if (!current || current.role !== "admin") {
    throw new Error("Forbidden");
  }
  if (current.id === userId) {
    throw new Error("You cannot remove your own access");
  }

  const supabase = getSupabase();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/admin/users");
}
