import { supabase } from "@/lib/supabase-server";
import type { LeadRow, LeadsListParams, PeopleFilters } from "@/lib/types";

const PAGE_SIZES = [25, 50, 100, 200, 500] as const;
const DEFAULT_PAGE_SIZE = 25;

function resolvePageSize(n: number | undefined): number {
  if (n == null) return DEFAULT_PAGE_SIZE;
  return PAGE_SIZES.includes(n as (typeof PAGE_SIZES)[number]) ? n : DEFAULT_PAGE_SIZE;
}

export interface FilterOptions {
  campaigns: string[];
  clients: string[];
  statuses: string[];
  esps: string[];
  timezones: string[];
  countries: string[];
  industries: string[];
  jobTitles: string[];
}

/** Fetch filter options: distinct values for selector-based filters */
export async function getFilterOptions(): Promise<FilterOptions> {
  try {
    const [campaignsRes, clientsRes, statusesRes, espRes, tzRes, countryRes, industryRes, jobTitleRes] = await Promise.all([
      supabase.from("person_campaigns").select("campaign_name").not("campaign_name", "is", null),
      supabase.from("person_campaigns").select("esp_client_name").not("esp_client_name", "is", null),
      supabase.from("person_campaigns").select("status").not("status", "is", null),
      supabase.from("people").select("esp").not("esp", "is", null),
      supabase.from("people").select("timezone").not("timezone", "is", null),
      supabase.from("people").select("lead_location").not("lead_location", "is", null),
      supabase.from("people").select("industry").not("industry", "is", null),
      supabase.from("people").select("job_title").not("job_title", "is", null),
    ]);

    const unique = (data: Record<string, unknown>[] | null, key: string) =>
      [...new Set((data ?? []).map((r) => r[key] as string).filter(Boolean))].sort();

    return {
      campaigns: unique(campaignsRes.data, "campaign_name"),
      clients: unique(clientsRes.data, "esp_client_name"),
      statuses: unique(statusesRes.data, "status"),
      esps: unique(espRes.data, "esp"),
      timezones: unique(tzRes.data, "timezone"),
      countries: unique(countryRes.data, "lead_location"),
      industries: unique(industryRes.data, "industry"),
      jobTitles: unique(jobTitleRes.data, "job_title"),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Missing env")) throw err;
    return { campaigns: [], clients: [], statuses: [], esps: [], timezones: [], countries: [], industries: [], jobTitles: [] };
  }
}

/** Check if any people-table filter is active */
export function hasPeopleFilters(p: PeopleFilters): boolean {
  return !!(
    p.esp?.length ||
    p.lead_country?.length ||
    p.industry?.length ||
    p.job_title_filter?.length ||
    p.timezone?.length ||
    p.emp_min != null ||
    p.emp_max != null
  );
}

/**
 * Pre-resolve valid company_size values for employee-count range filter.
 * Returns null if no range filter is active, or an array of matching sizes.
 */
export async function resolveEmployeeSizes(emp_min?: number, emp_max?: number): Promise<string[] | null> {
  if (emp_min == null && emp_max == null) return null;
  const { data } = await supabase
    .from("people")
    .select("company_size")
    .not("company_size", "is", null);
  return [
    ...new Set(
      (data ?? [])
        .map((r) => r.company_size as string)
        .filter((s) => {
          const n = parseInt(s, 10);
          if (isNaN(n)) return false;
          if (emp_min != null && n < emp_min) return false;
          if (emp_max != null && n > emp_max) return false;
          return true;
        })
    ),
  ];
}

/**
 * Build a single PostgREST .or() condition with proper value escaping.
 * Values containing commas, parentheses, or quotes are double-quoted
 * to prevent the .or() parser from splitting them incorrectly.
 */
export function orCond(col: string, op: string, val: string): string {
  if (/[,()"]/.test(val)) {
    return `${col}.${op}."${val.replace(/"/g, '\\"')}"`;
  }
  return `${col}.${op}.${val}`;
}

/**
 * Apply people-table filters to a Supabase query on the `people` table.
 * SYNCHRONOUS — call resolveEmployeeSizes() first and pass result as empSizes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyPeopleFilters(query: any, filters: PeopleFilters, empSizes?: string[] | null) {
  if (filters.esp?.length) {
    query = query.in("esp", filters.esp);
  }
  if (filters.lead_country?.length) {
    query = query.or(filters.lead_country.map((v) => orCond("lead_location", "ilike", `%${v}%`)).join(","));
  }
  if (filters.industry?.length) {
    query = query.or(filters.industry.map((v) => orCond("industry", "ilike", `%${v}%`)).join(","));
  }
  if (filters.job_title_filter?.length) {
    query = query.or(filters.job_title_filter.map((v) => orCond("job_title", "ilike", `%${v}%`)).join(","));
  }
  if (filters.timezone?.length) {
    query = query.or(filters.timezone.map((v) => orCond("timezone", "ilike", `%${v}%`)).join(","));
  }
  if (empSizes !== null && empSizes !== undefined) {
    if (empSizes.length === 0) {
      query = query.in("company_size", ["__NO_MATCH__"]);
    } else {
      query = query.in("company_size", empSizes);
    }
  }
  return query;
}

/** Resolve time range for last activity filter. */
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

function sortToColumn(sort: string): string {
  switch (sort) {
    case "name":
    case "email":
      return "email";
    case "company":
      return "company";
    case "job_title":
      return "job_title";
    default:
      return "created_at";
  }
}

/** Unique leads list: one row per person. Optional filters = "only leads that have at least one interaction matching". */
export async function getUniqueLeadsList(params: LeadsListParams): Promise<{
  rows: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  try {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = resolvePageSize(params.pageSize);
    const from = (page - 1) * pageSize;
    const sort = params.sort ?? "last_activity";
    const order = params.order ?? "desc";

    const hasCampaignFilter = !!(params.campaign?.length || params.client?.length || params.status?.length || params.has_interactions === "true");
    const hasPersonFilter = hasPeopleFilters(params);
    const timeRange = resolveTimeRange(params);

    // Pre-resolve employee sizes (async) so applyPeopleFilters stays sync
    const empSizes = await resolveEmployeeSizes(params.emp_min, params.emp_max);

    if (params.has_interactions === "false") {
      const { data: pcRows } = await supabase.from("person_campaigns").select("person_id");
      const withCampaigns = new Set((pcRows ?? []).map((r) => r.person_id));

      let peopleQuery = supabase
        .from("people")
        .select("id, email, first_name, last_name, company, job_title, created_at, updated_at", { count: "exact" });

      if (withCampaigns.size > 0) {
        peopleQuery = peopleQuery.not("id", "in", `(${Array.from(withCampaigns).join(",")})`);
      }
      peopleQuery = applyPeopleFilters(peopleQuery, params, empSizes);
      peopleQuery = peopleQuery.order(sortToColumn(sort), { ascending: order === "asc", nullsFirst: false });
      const res = await peopleQuery.range(from, from + pageSize - 1);
      const total = res.count ?? 0;
      const people = (res.data ?? []) as Array<{
        id: string; email: string; first_name: string | null; last_name: string | null;
        company: string | null; job_title: string | null; created_at: string; updated_at: string;
      }>;

      const rows: LeadRow[] = people.map((p) => ({
        id: p.id, email: p.email, first_name: p.first_name, last_name: p.last_name,
        company: p.company, job_title: p.job_title, campaign_summary: "0 campaigns", last_activity_at: null,
      }));
      return { rows, total, page, pageSize };
    }

    if (!hasCampaignFilter && !params.has_interactions && !timeRange) {
      let peopleQuery = supabase
        .from("people")
        .select("id, email, first_name, last_name, company, job_title, created_at, updated_at", { count: "exact" });
      peopleQuery = applyPeopleFilters(peopleQuery, params, empSizes);
      peopleQuery = peopleQuery.order(sortToColumn(sort), { ascending: order === "asc", nullsFirst: false });
      const res = await peopleQuery.range(from, from + pageSize - 1);
      const total = res.count ?? 0;
      const people = (res.data ?? []) as Array<{
        id: string; email: string; first_name: string | null; last_name: string | null;
        company: string | null; job_title: string | null; created_at: string; updated_at: string;
      }>;

      if (people.length === 0) {
        return { rows: [], total, page, pageSize };
      }

      const personIds = people.map((p) => p.id);
      const { data: pcRows } = await supabase
        .from("person_campaigns")
        .select("person_id, campaign_name, last_contacted_at, last_reply_at")
        .in("person_id", personIds);

      const byPerson = new Map<string, { count: number; lastActivity: string | null }>();
      for (const p of people) byPerson.set(p.id, { count: 0, lastActivity: null });
      for (const pc of pcRows ?? []) {
        const cur = byPerson.get(pc.person_id);
        if (!cur) continue;
        cur.count += 1;
        const d1 = pc.last_contacted_at ? new Date(pc.last_contacted_at).getTime() : 0;
        const d2 = pc.last_reply_at ? new Date(pc.last_reply_at).getTime() : 0;
        const latest = Math.max(d1, d2);
        if (latest && (!cur.lastActivity || latest > new Date(cur.lastActivity).getTime())) {
          cur.lastActivity = pc.last_contacted_at ?? pc.last_reply_at ?? null;
        }
      }

      const rows: LeadRow[] = people.map((p) => {
        const agg = byPerson.get(p.id);
        return {
          id: p.id, email: p.email, first_name: p.first_name, last_name: p.last_name,
          company: p.company, job_title: p.job_title,
          campaign_summary: agg?.count ? `${agg.count} campaign${agg.count === 1 ? "" : "s"}` : "0 campaigns",
          last_activity_at: agg?.lastActivity ?? null,
        };
      });
      return { rows, total, page, pageSize };
    }

    // Pre-filter people IDs if people-table filters are active
    let validPersonIds: Set<string> | null = null;
    if (hasPersonFilter) {
      let pQuery = supabase.from("people").select("id");
      pQuery = applyPeopleFilters(pQuery, params, empSizes);
      const { data } = await pQuery.limit(10000);
      validPersonIds = new Set((data ?? []).map((r) => (r as { id: string }).id));
      if (validPersonIds.size === 0) {
        return { rows: [], total: 0, page, pageSize };
      }
    }

    // Has campaign filters: only people that have at least one person_campaign matching
    let pcQuery = supabase
      .from("person_campaigns")
      .select("id, person_id, campaign_name, last_contacted_at, last_reply_at")
      .order("last_contacted_at", { ascending: false, nullsFirst: false });

    if (params.campaign?.length) pcQuery = pcQuery.in("campaign_name", params.campaign);
    if (params.client?.length) pcQuery = pcQuery.in("esp_client_name", params.client);
    if (params.status?.length) pcQuery = pcQuery.in("status", params.status);
    if (validPersonIds) pcQuery = pcQuery.in("person_id", Array.from(validPersonIds));
    if (timeRange) {
      pcQuery = pcQuery.gte("last_contacted_at", timeRange.from).lte("last_contacted_at", timeRange.to);
    }

    const { data: pcRows } = await pcQuery.limit(10000);
    const ordered = (pcRows ?? []) as Array<{
      id: string; person_id: string; campaign_name: string | null;
      last_contacted_at: string | null; last_reply_at: string | null;
    }>;

    const seen = new Set<string>();
    const personIdsOrdered: string[] = [];
    const latestByPerson = new Map<string, { campaign_name: string | null; last_activity: string | null }>();
    for (const row of ordered) {
      if (seen.has(row.person_id)) continue;
      seen.add(row.person_id);
      personIdsOrdered.push(row.person_id);
      const d1 = row.last_contacted_at ? new Date(row.last_contacted_at).getTime() : 0;
      const d2 = row.last_reply_at ? new Date(row.last_reply_at).getTime() : 0;
      const latest = d1 || d2 ? (d1 >= d2 ? row.last_contacted_at : row.last_reply_at) : null;
      latestByPerson.set(row.person_id, { campaign_name: row.campaign_name, last_activity: latest });
    }

    const total = personIdsOrdered.length;
    const pageIds = personIdsOrdered.slice(from, from + pageSize);
    if (pageIds.length === 0) return { rows: [], total, page, pageSize };

    const peopleRes = await supabase
      .from("people")
      .select("id, email, first_name, last_name, company, job_title")
      .in("id", pageIds);

    const people = (peopleRes.data ?? []) as Array<{
      id: string; email: string; first_name: string | null; last_name: string | null;
      company: string | null; job_title: string | null;
    }>;

    const { data: countData } = await supabase
      .from("person_campaigns")
      .select("person_id")
      .in("person_id", pageIds);
    const countByPerson = new Map<string, number>();
    for (const r of countData ?? []) {
      countByPerson.set(r.person_id, (countByPerson.get(r.person_id) ?? 0) + 1);
    }

    const rows: LeadRow[] = people.map((p) => {
      const latest = latestByPerson.get(p.id);
      const count = countByPerson.get(p.id) ?? 0;
      return {
        id: p.id, email: p.email, first_name: p.first_name, last_name: p.last_name,
        company: p.company, job_title: p.job_title,
        campaign_summary: count ? `${count} campaign${count === 1 ? "" : "s"}` : "0 campaigns",
        last_activity_at: latest?.last_activity ?? null,
      };
    });

    return { rows, total, page, pageSize };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Missing env")) throw err;
    return { rows: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE };
  }
}
