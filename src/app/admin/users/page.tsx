import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase-server";
import { AddUserForm } from "./AddUserForm";
import { RemoveAccessButton } from "./RemoveAccessButton";
import { RoleSelect } from "./RoleSelect";
import type { ProfileRole } from "@/app/actions/admin-users";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const supabase = getSupabase();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-medium">Error loading users</p>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-xl font-semibold tracking-tight text-gray-900">
        Manage users
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Invite users by email (they receive a login link), set roles, and remove access.
      </p>

      <AddUserForm />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {(profiles ?? []).map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {p.email}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  <RoleSelect
                    userId={p.id}
                    currentRole={(p.role ?? "user") as ProfileRole}
                    isCurrentUser={p.id === user.id}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {p.created_at
                    ? new Date(p.created_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  {p.id !== user.id ? (
                    <RemoveAccessButton userId={p.id} userEmail={p.email} />
                  ) : (
                    <span className="text-gray-400">(you)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
