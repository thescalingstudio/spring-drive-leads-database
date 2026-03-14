import Link from "next/link";
import type { InteractionRow, SortField } from "@/lib/types";
import { formatStatus } from "@/lib/format";

function formatDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString(undefined, { dateStyle: "short" });
}

function displayName(row: InteractionRow) {
  const first = row.first_name ?? "";
  const last = row.last_name ?? "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || row.email;
}

interface InteractionsTableProps {
  rows: InteractionRow[];
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

export function InteractionsTable({ rows, sortField, sortOrder, baseParams }: InteractionsTableProps) {
  function sortUrl(field: SortField): string {
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
    return `/interactions?${next.toString()}`;
  }

  function sortState(field: SortField): "asc" | "desc" | "none" {
    if (sortField !== field) return "none";
    return sortOrder === "asc" ? "asc" : "desc";
  }

  const hasFilters =
    baseParams.has("campaign") ||
    baseParams.has("client") ||
    baseParams.has("status") ||
    baseParams.has("dnc") ||
    baseParams.has("time") ||
    baseParams.has("time_from") ||
    baseParams.has("time_to") ||
    baseParams.has("email");

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200/80 bg-white p-12 text-center shadow-sm">
        {hasFilters ? (
          <>
            <p className="text-gray-500">No interactions match the current filters.</p>
            <Link
              href="/interactions"
              className="mt-3 inline-block text-sm font-medium text-gray-900 hover:underline"
            >
              Clear all filters and show all
            </Link>
          </>
        ) : (
          <p className="text-gray-500">
            No interaction records yet. Data appears here when leads are added to campaigns (person_campaigns). Check the <Link href="/leads" className="font-medium text-gray-900 hover:underline">Leads</Link> page to see people in your database.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200/80">
        <thead>
          <tr className="bg-gray-50/80">
            {/* Lead, Email, Company: not sortable (fetched from people table after main query) */}
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Lead</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Company</th>
            {(
              [
                { field: "campaign_name", label: "Campaign" },
                { field: "esp_client_name", label: "Client" },
                { field: "status", label: "Status" },
              ] as { field: SortField; label: string }[]
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
              <Link
                href={sortUrl("last_contacted_at")}
                className={`inline-flex items-center gap-1 hover:text-gray-900 ${sortField === "last_contacted_at" ? "text-gray-900" : ""}`}
              >
                Last contacted
                <SortIcon state={sortState("last_contacted_at")} />
              </Link>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <Link
                href={sortUrl("last_reply_at")}
                className={`inline-flex items-center gap-1 hover:text-gray-900 ${sortField === "last_reply_at" ? "text-gray-900" : ""}`}
              >
                Last reply
                <SortIcon state={sortState("last_reply_at")} />
              </Link>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <Link
                href={sortUrl("dnc")}
                className={`inline-flex items-center gap-1 hover:text-gray-900 ${sortField === "dnc" ? "text-gray-900" : ""}`}
              >
                DNC
                <SortIcon state={sortState("dnc")} />
              </Link>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200/80">
          {rows.map((row) => (
            <tr key={row.person_campaign_id} className="transition-colors hover:bg-gray-50/50">
              <td className="px-4 py-3">
                <Link href={`/leads/${row.person_id}`} className="font-medium text-gray-900 hover:text-gray-600">
                  {displayName(row)}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{row.email}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{row.company ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{row.campaign_name ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{row.esp_client_name ?? "—"}</td>
              <td className="px-4 py-3">
                {row.status ? (
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {formatStatus(row.status)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.last_contacted_at)}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.last_reply_at)}</td>
              <td className="px-4 py-3">
                {row.dnc ? (
                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">DNC</span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
