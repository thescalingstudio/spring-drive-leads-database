"use client";

import { useState } from "react";
import { inviteUser, type ProfileRole } from "@/app/actions/admin-users";

export function AddUserForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProfileRole>("user");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await inviteUser(email.trim(), role);
      setSuccess(`Invite sent to ${email.trim()}. They’ll receive an email to set their password and sign in.`);
      setEmail("");
      setRole("user");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="new-user-email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="new-user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="colleague@example.com"
          className="w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="new-user-role" className="text-sm font-medium text-gray-700">
          Role
        </label>
        <select
          id="new-user-role"
          value={role}
          onChange={(e) => setRole(e.target.value as ProfileRole)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Invite user"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="w-full text-sm text-green-700">
          {success}
        </p>
      )}
    </form>
  );
}
