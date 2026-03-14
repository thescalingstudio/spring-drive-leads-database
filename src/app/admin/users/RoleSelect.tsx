"use client";

import { useState } from "react";
import { updateUserRole, type ProfileRole } from "@/app/actions/admin-users";

interface Props {
  userId: string;
  currentRole: ProfileRole;
  isCurrentUser: boolean;
}

export function RoleSelect({ userId, currentRole, isCurrentUser }: Props) {
  const [role, setRole] = useState<ProfileRole>(currentRole);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as ProfileRole;
    setRole(newRole);
    setLoading(true);
    try {
      await updateUserRole(userId, newRole);
    } catch {
      setRole(currentRole);
    } finally {
      setLoading(false);
    }
  }

  if (isCurrentUser) {
    return (
      <span
        className={
          currentRole === "admin"
            ? "rounded bg-amber-100 px-2 py-0.5 text-amber-800"
            : "text-gray-600"
        }
      >
        {currentRole}
      </span>
    );
  }

  return (
    <select
      value={role}
      onChange={handleChange}
      disabled={loading}
      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-60"
    >
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>
  );
}
