"use client";

import { useState } from "react";
import { removeUserAccess } from "@/app/actions/admin-users";

interface Props {
  userId: string;
  userEmail: string;
}

export function RemoveAccessButton({ userId, userEmail }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    await removeUserAccess(userId);
    setLoading(false);
  }

  function handleCancel() {
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-gray-500">Remove {userEmail}?</span>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={loading}
          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          {loading ? "Removing…" : "Remove access"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      className="text-red-600 hover:text-red-800 hover:underline"
    >
      Remove access
    </button>
  );
}
