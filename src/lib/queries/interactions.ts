import { supabase } from "@/lib/supabase-server";
import type { InteractionRow, InteractionsListParams, SortField } from "@/lib/types";
import { getFilterOptions, hasPeopleFilters, resolveEmployeeSizes, orCond } from "./leads";

const PAGE_SIZES = [25, 50, 100, 200, 500] as const;
const DEFAULT_PAGE_SIZE = 25;

function resolvePageSize(n: number | undefined): number {
  if (n == null) return DEFAULT_PAGE_SIZE;
  return PAGE_SIZES.includes(n as (typeof PAGE_SIZES)[number]) ? n : DEFAULT_PAGE_SIZE;
}

export { getFilterOptions };

/** Resolve time range for interactions filter (last_contacted_at). */
function resolveTimeRange(params: {
  time?: "7d" | "30d" | "custom";
  time_from?: string;
  time_to?: string;
}): { from: string; to: string } | null {
  const now = new Date();
  if (params.time === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (params.time === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (params.time === "custom" && params.time_from && params.time_to) {
    const from = new Date(params.time_from + "T00:00:00.000Z");
    const to = new Date(params.time_to + "T23:59:59.999Z");
    return { from: from.toISOString(), to: to.toISOString() };
  }
  return null;
}

/** Valid sort columns for the person_campaigns table */
const VALID_PC_SORT: Set<string> = new Set([
  "id", "last_contacted_at", "last_reply_at", "created_at",
  "campaign_name", "esp_client_name", "status", "dnc",
]);

/** Interactions list: one row per person_campaign (same lead can appear multiple times). */
export async function getInteractionsList(params: InteractionsListParams): Promise<{
  rows: InteractionRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  try {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = resolvePageSize(params.pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const hasPersonFilter = hasPeopleFilters(params);
    const needsPeopleJoin = hasPersonFilter || !!params.email?.trim();

    // Pre-resolve employee sizes if needed (async, so filter logic stays sync)
    const empSizes = needsPeopleJoin
      ? await resolveEmployeeSizes(params.emp_min, params.emp_max)
      : null;

    // Build the select — use inner join with people when people-level filters are active.
    // This avoids passing large ID arrays via URL (which can exceed PostgREST limits).
    const baseCols = "id, person_id, status, last_contacted_at, last_reply_at, campaign_name, esp_client_name, dnc";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pcQuery: any = supabase
      .from("person_campaigns")
      .select(
        needsPeopleJoin ? `${baseCols}, people!inner(id)` : baseCols,
        { count: "exact" }
      );

    // Apply people-table filters through the inner join (database-level, no large URL)
    if (params.email?.trim()) {
      pcQuery = pcQuery.eq("people.email", params.email.trim());
    }
    if (hasPersonFilter) {
      if (params.esp?.length) {
        pcQuery = pcQuery.in("people.esp", params.esp);
      }
      if (params.lead_country?.length) {
        pcQuery = pcQuery.or(
          params.lead_country.map((v) => orCond("lead_location", "ilike", `%${v}%`)).join(","),
          { referencedTable: "people" }
        );
      }
      if (params.industry?.length) {
        pcQuery = pcQuery.or(
          params.industry.map((v) => orCond("industry", "ilike", `%${v}%`)).join(","),
          { referencedTable: "people" }
        );
      }
      if (params.job_title_filter?.length) {
        pcQuery = pcQuery.or(
          params.job_title_filter.map((v) => orCond("job_title", "ilike", `%${v}%`)).join(","),
          { referencedTable: "people" }
        );
      }
      if (params.timezone?.length) {
        pcQuery = pcQuery.or(
          params.timezone.map((v) => orCond("timezone", "ilike", `%${v}%`)).join(","),
          { referencedTable: "people" }
        );
      }
      if (empSizes !== null && empSizes !== undefined) {
        if (empSizes.length === 0) {
          pcQuery = pcQuery.in("people.company_size", ["__NO_MATCH__"]);
        } else {
          pcQuery = pcQuery.in("people.company_size", empSizes);
        }
      }
    }

    // Campaign-level filters (directly on person_campaigns)
    if (params.campaign?.length) pcQuery = pcQuery.in("campaign_name", params.campaign);
    if (params.client?.length) pcQuery = pcQuery.in("esp_client_name", params.client);
    if (params.status?.length) pcQuery = pcQuery.in("status", params.status);
    if (params.dnc === "true") pcQuery = pcQuery.eq("dnc", true);
    if (params.dnc === "false") pcQuery = pcQuery.eq("dnc", false);

    const timeRange = resolveTimeRange(params);
    if (timeRange) {
      pcQuery = pcQuery.gte("last_contacted_at", timeRange.from).lte("last_contacted_at", timeRange.to);
    }

    // Validate sort field to prevent Bad Request from invalid column names
    const sortField: SortField = VALID_PC_SORT.has(params.sort ?? "")
      ? (params.sort as SortField)
      : "last_contacted_at";
    const order = params.order ?? "desc";
    pcQuery = pcQuery.order(sortField, { ascending: order === "asc", nullsFirst: false });

    const pcRes = await pcQuery.range(from, to);
    if (pcRes.error) {
      const details = [pcRes.error.message, pcRes.error.details, pcRes.error.hint].filter(Boolean).join(" — ");
      throw new Error(`person_campaigns: ${details}`);
    }
    const total = pcRes.count ?? 0;
    const pcRows = pcRes.data ?? [];

    if (pcRows.length === 0) {
      return { rows: [], total, page, pageSize };
    }

    // Fetch person details for the current page of results
    const personIds = [...new Set(pcRows.map((r: Record<string, unknown>) => r.person_id as string))];
    const peopleRes = await supabase
      .from("people")
      .select("id, email, first_name, last_name, company, job_title")
      .in("id", personIds);

    if (peopleRes.error) {
      throw new Error(`people: ${peopleRes.error.message}`);
    }
    const peopleMap = new Map(
      (peopleRes.data ?? []).map((p: Record<string, unknown>) => [p.id as string, p])
    );

    const rows: InteractionRow[] = pcRows.map((row: Record<string, unknown>) => {
      const p = peopleMap.get(row.person_id as string) as
        | { id: string; email: string; first_name: string | null; last_name: string | null; company: string | null; job_title: string | null }
        | undefined;
      return {
        person_id: row.person_id as string,
        person_campaign_id: row.id as string,
        email: p?.email ?? (row.person_id as string),
        first_name: p?.first_name ?? null,
        last_name: p?.last_name ?? null,
        company: p?.company ?? null,
        job_title: p?.job_title ?? null,
        campaign_name: (row.campaign_name as string | null) ?? null,
        esp_client_name: (row.esp_client_name as string | null) ?? null,
        status: (row.status as string | null) ?? null,
        last_contacted_at: (row.last_contacted_at as string | null) ?? null,
        last_reply_at: (row.last_reply_at as string | null) ?? null,
        dnc: (row.dnc as boolean) ?? false,
      };
    });

    return { rows, total, page, pageSize };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Missing env")) throw err;
    console.error("getInteractionsList error:", err);
    throw err;
  }
}
