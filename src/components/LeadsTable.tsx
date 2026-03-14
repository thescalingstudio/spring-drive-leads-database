import Link from "next/link";
import type { LeadRow } from "@/lib/types";

function formatDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString(undefined, { dateStyle: "short" });
}

function displayName(row: LeadRow) {
  const first = row.first_name ?? "";
  const last = row.last_name ?? "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || row.email;
}

type LeadsSort = "name" | "email" | "company" | "job_title" | "last_activity";

interface LeadsTableProps {
  rows: LeadRow[];
  sortField: string | undefined;
  sortOrder: string | undefined;
  baseParams: URLSearchParams;
}

function SortIcon({ state }: { state: "asc" | "desc" | "none" }) {
  if (state === "asc") {
    return (
      <svg className="inline h-3 w-3 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7l3-4 3 4" />
      </svg>
    );
  }
  if (state === "desc") {
    return (
      <svg className="inline h-3 w-3 shrink-0" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3l3 4 3-4" />
      </svg>
    );
  }
  return (
    <svg className="inline h-3 w-3 shrink-0 opacity-35" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5l3-2 3 2M2 6.5l3 2 3-2" />
    </svg>
  );
}

export function LeadsTable({ rows, sortField, sortOrder, baseParams }: LeadsTableProps) {
  function sortUrl(field: LeadsSort): string {
    const next = new URLSearchParams(baseParams);
    next.delete("page");
    if (sortField === field) {
      if (sortOrder === "asc") {
        next.set("sort", field);
        next.set("order", "desc");
      } else {
        next.delete("sort");
        next.delete("order");
      }
    } else {
      next.set("sort", field);
      next.set("order", "asc");
    }
    return `/?${next.toString()}`;
  }

  function sortState(field: LeadsSort): "asc" | "desc" | "none" {
    if (sortField !== field) return "none";
    return sortOrder === "asc" ? "asc" : "desc";
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200/80 bg-white p-12 text-center text-gray-500 shadow-sm">
        No leads match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200/80">
        <thead>
          <tr className="bg-gray-50/80">
            {(
              [
                { field: "name", label: "Name" },
                { field: "email", label: "Email" },
                { field: "company", label: "Company" },
                { field: "job_title", label: "Job title" },
              ] as { field: LeadsSort; label: string }[]
            ).map(({ field, label }) => (
              <th key={field} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <Link
                  href={sortUrl(field)}
                  className={`inline-flex items-center gap-1 hover:text-gray-900 ${sortField === field ? "text-gray-900" : ""}`}
                >
                  {label}
                  <SortIcon state={sortState(field)} />
                </Link>
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              Campaigns
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <Link
                href={sortUrl("last_activity")}
                className={`inline-flex items-center gap-1 hover:text-gray-900 ${sortField === "last_activity" ? "text-gray-900" : ""}`}
              >
                Last activity
                <SortIcon state={sortState("last_activity")} />
              </Link>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200/80">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-gray-50/50">
              <td className="px-4 py-3">
                <Link href={`/leads/${row.id}`} className="font-medium text-gray-900 hover:text-gray-600">
                  {displayName(row)}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{row.email}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{row.company ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{row.job_title ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{row.campaign_summary ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.last_activity_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
