import { supabase } from "@/lib/supabase-server";
import { applyPeopleFilters, hasPeopleFilters, resolveEmployeeSizes } from "./leads";
import type { PeopleFilters } from "@/lib/types";

export interface ExportFilters {
  // Common (comma-separated for multi-select)
  campaign?: string;
  client?: string;
  status?: string;
  // Leads-specific
  has_interactions?: string;
  // Interactions-specific
  dnc?: string;
  time?: string;
  time_from?: string;
  time_to?: string;
  email?: string;
  // People-table filters (comma-separated for multi-select)
  esp?: string;
  lead_country?: string;
  industry?: string;
  job_title_filter?: string;
  timezone?: string;
  emp_min?: string;
  emp_max?: string;
}

/** All columns from the people table plus aggregated campaign data */
export interface LeadExportRow {
  // people
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  domain: string | null;
  job_title: string | null;
  company_size: string | null;
  industry: string | null;
  lead_location: string | null;
  linkedin_url: string | null;
  timezone: string | null;
  esp: string | null;
  source: string | null;
  validation: string | null;
  last_validated: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // aggregated
  campaign_count: number;
  last_activity_at: string | null;
}

/**
 * All columns from people + person_campaigns.
 * Conflicting names (id, created_at, updated_at) are prefixed:
 *   person_id, person_created_at, person_updated_at
 *   campaign_record_id, campaign_created_at, campaign_updated_at
 */
export interface InteractionExportRow {
  // people
  person_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  domain: string | null;
  job_title: string | null;
  company_size: string | null;
  industry: string | null;
  lead_location: string | null;
  linkedin_url: string | null;
  timezone: string | null;
  esp: string | null;
  source: string | null;
  validation: string | null;
  last_validated: string | null;
  custom_fields: Record<string, unknown> | null;
  person_created_at: string;
  person_updated_at: string;
  // person_campaigns
  campaign_record_id: string;
  campaign_id: number | null;
  campaign_name: string | null;
  esp_client_id: number | null;
  esp_client_name: string | null;
  status: string | null;
  last_contacted_at: string | null;
  last_reply_at: string | null;
  last_reply_type: string | null;
  dnc: boolean;
  campaign_created_at: string;
  campaign_updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveTimeRange(filters: ExportFilters): { from: string; to: string } | null {
  const now = new Date();
  if (filters.time === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (filters.time === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (filters.time === "custom" && filters.time_from && filters.time_to) {
    return {
      from: new Date(filters.time_from + "T00:00:00.000Z").toISOString(),
      to: new Date(filters.time_to + "T23:59:59.999Z").toISOString(),
    };
  }
  return null;
}

/** Parse comma-separated export filter strings into PeopleFilters */
function toPeopleFilters(f: ExportFilters): PeopleFilters {
  return {
    esp: f.esp?.split(",").filter(Boolean),
    lead_country: f.lead_country?.split(",").filter(Boolean),
    industry: f.industry?.split(",").filter(Boolean),
    job_title_filter: f.job_title_filter?.split(",").filter(Boolean),
    timezone: f.timezone?.split(",").filter(Boolean),
    emp_min: f.emp_min ? parseInt(f.emp_min, 10) : undefined,
    emp_max: f.emp_max ? parseInt(f.emp_max, 10) : undefined,
  };
}

/** Parse comma-separated string into array for .in() filtering */
function parseMultiFilter(val?: string): string[] | null {
  if (!val) return null;
  const arr = val.split(",").filter(Boolean);
  return arr.length > 0 ? arr : null;
}

// Type for a raw row from the people table (select *)
type PersonRow = Record<string, unknown> & { id: string; email: string };

function mapPerson(p: PersonRow): Omit<LeadExportRow, "campaign_count" | "last_activity_at"> {
  return {
    id: p.id,
    email: p.email as string,
    first_name: (p.first_name as string | null) ?? null,
    last_name: (p.last_name as string | null) ?? null,
    company: (p.company as string | null) ?? null,
    domain: (p.domain as string | null) ?? null,
    job_title: (p.job_title as string | null) ?? null,
    company_size: (p.company_size as string | null) ?? null,
    industry: (p.industry as string | null) ?? null,
    lead_location: (p.lead_location as string | null) ?? null,
    linkedin_url: (p.linkedin_url as string | null) ?? null,
    timezone: (p.timezone as string | null) ?? null,
    esp: (p.esp as string | null) ?? null,
    source: (p.source as string | null) ?? null,
    validation: (p.validation as string | null) ?? null,
    last_validated: (p.last_validated as string | null) ?? null,
    custom_fields: (p.custom_fields as Record<string, unknown> | null) ?? null,
    created_at: p.created_at as string,
    updated_at: p.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Leads export
// ---------------------------------------------------------------------------

export async function getLeadsForExport(filters: ExportFilters): Promise<LeadExportRow[]> {
  const pf = toPeopleFilters(filters);
  const hasPersonFilter = hasPeopleFilters(pf);
  const empSizes = await resolveEmployeeSizes(pf.emp_min, pf.emp_max);
  const campaignArr = parseMultiFilter(filters.campaign);
  const clientArr = parseMultiFilter(filters.client);
  const statusArr = parseMultiFilter(filters.status);
  const timeRange = resolveTimeRange(filters);
  const hasCampaignFilter = !!(campaignArr || clientArr || statusArr || filters.has_interactions === "true");

  // Pre-filter people IDs if people-table filters are active
  let validPersonIds: Set<string> | null = null;
  if (hasPersonFilter) {
    let pQuery = supabase.from("people").select("id");
    pQuery = applyPeopleFilters(pQuery, pf, empSizes);
    const { data } = await pQuery.limit(10000);
    validPersonIds = new Set((data ?? []).map((r) => (r as { id: string }).id));
    if (validPersonIds.size === 0) return [];
  }

  // Leads with no interactions
  if (filters.has_interactions === "false") {
    const { data: pcRows } = await supabase.from("person_campaigns").select("person_id");
    const withCampaigns = new Set((pcRows ?? []).map((r) => r.person_id));

    let q = supabase.from("people").select("*");
    if (withCampaigns.size > 0) {
      q = q.not("id", "in", `(${Array.from(withCampaigns).join(",")})`);
    }
    q = applyPeopleFilters(q, pf, empSizes);
    const { data } = await q.limit(10000);
    return (data ?? []).map((p) => ({ ...mapPerson(p as PersonRow), campaign_count: 0, last_activity_at: null }));
  }

  // No campaign filters — all people (with people-table filters applied)
  if (!hasCampaignFilter && !filters.has_interactions && !timeRange) {
    let pQuery = supabase.from("people").select("*");
    pQuery = applyPeopleFilters(pQuery, pf, empSizes);
    const { data: people } = await pQuery.limit(10000);
    if (!people || people.length === 0) return [];

    const personIds = (people as PersonRow[]).map((p) => p.id);
    const { data: pcRows } = await supabase
      .from("person_campaigns")
      .select("person_id, last_contacted_at, last_reply_at")
      .in("person_id", personIds);

    const byPerson = new Map<string, { count: number; lastActivity: string | null }>();
    for (const p of people as PersonRow[]) byPerson.set(p.id, { count: 0, lastActivity: null });

    for (const pc of pcRows ?? []) {
      const cur = byPerson.get(pc.person_id);
      if (!cur) continue;
      cur.count += 1;
      const d1 = pc.last_contacted_at ? new Date(pc.last_contacted_at).getTime() : 0;
      const d2 = pc.last_reply_at ? new Date(pc.last_reply_at).getTime() : 0;
      const latest = Math.max(d1, d2);
      if (latest && (!cur.lastActivity || latest > new Date(cur.lastActivity).getTime())) {
        cur.lastActivity = d1 >= d2 ? pc.last_contacted_at : pc.last_reply_at;
      }
    }

    return (people as PersonRow[]).map((p) => {
      const agg = byPerson.get(p.id);
      return { ...mapPerson(p), campaign_count: agg?.count ?? 0, last_activity_at: agg?.lastActivity ?? null };
    });
  }

  // Campaign filters active — find matching person_ids via person_campaigns
  let pcQuery = supabase
    .from("person_campaigns")
    .select("person_id, last_contacted_at, last_reply_at")
    .order("last_contacted_at", { ascending: false, nullsFirst: false });

  if (campaignArr) pcQuery = pcQuery.in("campaign_name", campaignArr);
  if (clientArr) pcQuery = pcQuery.in("esp_client_name", clientArr);
  if (statusArr) pcQuery = pcQuery.in("status", statusArr);
  if (validPersonIds) pcQuery = pcQuery.in("person_id", Array.from(validPersonIds));
  if (timeRange) {
    pcQuery = pcQuery.gte("last_contacted_at", timeRange.from).lte("last_contacted_at", timeRange.to);
  }

  const { data: pcRows } = await pcQuery.limit(10000);

  const seen = new Set<string>();
  const personIds: string[] = [];
  const latestByPerson = new Map<string, string | null>();

  for (const row of pcRows ?? []) {
    if (seen.has(row.person_id)) continue;
    seen.add(row.person_id);
    personIds.push(row.person_id);
    const d1 = row.last_contacted_at ? new Date(row.last_contacted_at).getTime() : 0;
    const d2 = row.last_reply_at ? new Date(row.last_reply_at).getTime() : 0;
    latestByPerson.set(row.person_id, d1 >= d2 ? row.last_contacted_at : row.last_reply_at);
  }

  if (personIds.length === 0) return [];

  const { data: people } = await supabase.from("people").select("*").in("id", personIds);

  const { data: countData } = await supabase
    .from("person_campaigns")
    .select("person_id")
    .in("person_id", personIds);

  const countByPerson = new Map<string, number>();
  for (const r of countData ?? []) {
    countByPerson.set(r.person_id, (countByPerson.get(r.person_id) ?? 0) + 1);
  }

  return (people ?? []).map((p) => {
    const pr = p as PersonRow;
    return {
      ...mapPerson(pr),
      campaign_count: countByPerson.get(pr.id) ?? 0,
      last_activity_at: latestByPerson.get(pr.id) ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Interactions export
// ---------------------------------------------------------------------------

export async function getInteractionsForExport(filters: ExportFilters): Promise<InteractionExportRow[]> {
  const pf = toPeopleFilters(filters);
  const hasPersonFilter = hasPeopleFilters(pf);
  const empSizes = await resolveEmployeeSizes(pf.emp_min, pf.emp_max);

  let personIdsFilter: string[] | null = null;
  if (filters.email?.trim() || hasPersonFilter) {
    let pQuery = supabase.from("people").select("id");
    if (filters.email?.trim()) {
      pQuery = pQuery.eq("email", filters.email.trim());
    }
    if (hasPersonFilter) {
      pQuery = applyPeopleFilters(pQuery, pf, empSizes);
    }
    const { data: peopleData } = await pQuery.limit(10000);
    const ids = (peopleData ?? []).map((p) => p.id);
    if (ids.length === 0) return [];
    personIdsFilter = ids;
  }

  let pcQuery = supabase
    .from("person_campaigns")
    .select("*")
    .order("last_contacted_at", { ascending: false, nullsFirst: false });

  if (personIdsFilter) pcQuery = pcQuery.in("person_id", personIdsFilter);
  const expCampaignArr = parseMultiFilter(filters.campaign);
  const expClientArr = parseMultiFilter(filters.client);
  const expStatusArr = parseMultiFilter(filters.status);
  if (expCampaignArr) pcQuery = pcQuery.in("campaign_name", expCampaignArr);
  if (expClientArr) pcQuery = pcQuery.in("esp_client_name", expClientArr);
  if (expStatusArr) pcQuery = pcQuery.in("status", expStatusArr);
  if (filters.dnc === "true") pcQuery = pcQuery.eq("dnc", true);
  if (filters.dnc === "false") pcQuery = pcQuery.eq("dnc", false);

  const timeRange = resolveTimeRange(filters);
  if (timeRange) {
    pcQuery = pcQuery.gte("last_contacted_at", timeRange.from).lte("last_contacted_at", timeRange.to);
  }

  const { data: pcRows } = await pcQuery.limit(10000);
  if (!pcRows || pcRows.length === 0) return [];

  const personIds = [...new Set(pcRows.map((r) => r.person_id))];
  const { data: peopleData } = await supabase.from("people").select("*").in("id", personIds);
  const peopleMap = new Map((peopleData ?? []).map((p) => [p.id as string, p as PersonRow]));

  // Deduplicate by email — keep first (most recently contacted, sorted desc)
  const seenEmails = new Set<string>();
  const result: InteractionExportRow[] = [];

  for (const row of pcRows) {
    const person = peopleMap.get(row.person_id);
    const email = person?.email ?? (row.person_id as string);
    if (seenEmails.has(email as string)) continue;
    seenEmails.add(email as string);

    result.push({
      // people fields
      person_id: row.person_id as string,
      email: email as string,
      first_name: (person?.first_name as string | null) ?? null,
      last_name: (person?.last_name as string | null) ?? null,
      company: (person?.company as string | null) ?? null,
      domain: (person?.domain as string | null) ?? null,
      job_title: (person?.job_title as string | null) ?? null,
      company_size: (person?.company_size as string | null) ?? null,
      industry: (person?.industry as string | null) ?? null,
      lead_location: (person?.lead_location as string | null) ?? null,
      linkedin_url: (person?.linkedin_url as string | null) ?? null,
      timezone: (person?.timezone as string | null) ?? null,
      esp: (person?.esp as string | null) ?? null,
      source: (person?.source as string | null) ?? null,
      validation: (person?.validation as string | null) ?? null,
      last_validated: (person?.last_validated as string | null) ?? null,
      custom_fields: (person?.custom_fields as Record<string, unknown> | null) ?? null,
      person_created_at: (person?.created_at as string) ?? "",
      person_updated_at: (person?.updated_at as string) ?? "",
      // person_campaigns fields
      campaign_record_id: row.id as string,
      campaign_id: (row.campaign_id as number | null) ?? null,
      campaign_name: (row.campaign_name as string | null) ?? null,
      esp_client_id: (row.esp_client_id as number | null) ?? null,
      esp_client_name: (row.esp_client_name as string | null) ?? null,
      status: (row.status as string | null) ?? null,
      last_contacted_at: (row.last_contacted_at as string | null) ?? null,
      last_reply_at: (row.last_reply_at as string | null) ?? null,
      last_reply_type: (row.last_reply_type as string | null) ?? null,
      dnc: (row.dnc as boolean) ?? false,
      campaign_created_at: row.created_at as string,
      campaign_updated_at: row.updated_at as string,
    });
  }

  return result;
}
