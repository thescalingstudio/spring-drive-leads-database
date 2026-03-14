"use client";

import { useState, useTransition } from "react";
import { exportLeadsAsCSV, exportInteractionsAsCSV } from "@/app/actions/export";
import type { ExportFilters } from "@/lib/queries/export";

interface ExportButtonProps {
  source: "leads" | "interactions";
  filters: ExportFilters;
  total: number;
}

export function ExportButton({ source, filters, total }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "webhook">("csv");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    count: number;
    background?: boolean;
    error?: string;
  } | null>(null);

  function handleClose() {
    setOpen(false);
    setResult(null);
    setFormat("csv");
  }

  function handleExport() {
    startTransition(async () => {
      if (format === "csv") {
        const csv =
          source === "leads"
            ? await exportLeadsAsCSV(filters)
            : await exportInteractionsAsCSV(filters);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${source}-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        handleClose();
      } else {
        try {
          const res = await fetch("/api/webhook-export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source, filters, webhookUrl }),
          });
          if (!res.ok) {
            const text = await res.text();
            setResult({ success: false, count: 0, error: `Server error ${res.status}: ${text}` });
          } else {
            const data = await res.json();
            setResult({ success: true, count: data.count, background: true });
          }
        } catch (err) {
          setResult({ success: false, count: 0, error: err instanceof Error ? err.message : "Unknown error" });
        }
      }
    });
  }

  const label = source === "leads" ? "lead" : "interaction";
  const webhookInvalid = format === "webhook" && !webhookUrl.trim();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
      >
        Export
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Export {source}
              </h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>

            {result ? (
              /* Result state */
              <>
                <div
                  className={`mb-4 rounded-xl p-4 ${
                    result.success
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {result.success ? (
                    <>
                      <p className="text-sm font-medium">
                        Sending {result.count.toLocaleString()} {label}{result.count !== 1 ? "s" : ""} to webhook.
                      </p>
                      <p className="mt-0.5 text-xs opacity-75">
                        Running in the background — safe to navigate away.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Failed to send to webhook</p>
                      {result.error && (
                        <p className="mt-1 text-sm opacity-80">{result.error}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleClose}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              /* Selection state */
              <>
                <p className="mb-4 text-sm text-gray-500">
                  {total.toLocaleString()} {label}{total !== 1 ? "s" : ""} match the current filters.
                  {source === "interactions" && (
                    <span className="block mt-0.5 text-gray-400">
                      Duplicates will be removed — one row per email.
                    </span>
                  )}
                </p>

                {/* Format options */}
                <div className="mb-4 space-y-2">
                  <button
                    onClick={() => setFormat("csv")}
                    className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${
                      format === "csv"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">Download CSV</p>
                    <p className="text-xs text-gray-500">Save as a spreadsheet file</p>
                  </button>

                  <button
                    onClick={() => setFormat("webhook")}
                    className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${
                      format === "webhook"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">Send to webhook</p>
                    <p className="text-xs text-gray-500">One-time POST to a Clay or custom webhook URL</p>
                  </button>
                </div>

                {/* Webhook URL input */}
                {format === "webhook" && (
                  <div className="mb-4">
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://hooks.clay.com/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
                      autoFocus
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleClose}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={isPending || webhookInvalid}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                  >
                    {isPending
                      ? "Exporting…"
                      : format === "csv"
                      ? "Download CSV"
                      : "Send to webhook"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
