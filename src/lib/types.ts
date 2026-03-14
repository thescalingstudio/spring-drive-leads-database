export interface Person {
  id: string;
  email: string;
  linkedin_url: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  domain: string | null;
  job_title: string | null;
  company_size: string | null;
  industry: string | null;
  lead_location: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  validation: string | null;
  last_validated: string | null;
  source: string | null;
  timezone: string | null;
  esp: string | null;
}

export interface PersonCampaign {
  id: string;
  person_id: string;
  status: string | null;
  last_contacted_at: string | null;
  last_reply_at: string | null;
  last_reply_type: string | null;
  dnc: boolean;
  created_at: string;
  updated_at: string;
  campaign_id: number | null;
  campaign_name: string | null;
  esp_client_id: number | null;
  esp_client_name: string | null;
}

export interface TouchEvent {
  id: string;
  person_campaign_id: string;
  direction: string | null;
  reply_classification: string | null;
  occurred_at: string;
  raw_subject: string | null;
  raw_body_snippet: string | null;
  external_id: string | null;
  created_at: string;
  message_id: string | null;
}

/** One row in the unique leads list: one person (no duplicate leads) */
export interface LeadRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  /** Latest or summary: e.g. "3 campaigns" or latest campaign name */
  campaign_summary: string | null;
  last_activity_at: string | null;
}

/** One row in the interactions list: one person_campaign (same lead can appear multiple times) */
export interface InteractionRow {
  person_id: string;
  person_campaign_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  campaign_name: string | null;
  esp_client_name: string | null;
  status: string | null;
  last_contacted_at: string | null;
  last_reply_at: string | null;
  dnc: boolean;
}

/** Campaign aggregate for overview page */
export interface CampaignSummary {
  campaign_name: string | null;
  esp_client_name: string | null;
  total: number;
  by_status: Record<string, number>;
}

export type SortField = "id" | "last_contacted_at" | "last_reply_at" | "created_at" | "campaign_name" | "esp_client_name" | "status" | "dnc";
export type SortDir = "asc" | "desc";

/** Shared people-table filters (used by both leads & interactions) */
export interface PeopleFilters {
  esp?: string[];              // multi-select, exact match
  lead_country?: string[];     // free-text contains
  industry?: string[];         // free-text contains
  job_title_filter?: string[]; // free-text contains
  timezone?: string[];         // multi-select, ilike contains
  emp_min?: number;            // employee count range min
  emp_max?: number;            // employee count range max
}

export interface LeadsListParams extends PeopleFilters {
  /** Only show leads that have at least one interaction matching these */
  campaign?: string[];
  client?: string[];
  status?: string[];
  has_interactions?: "true" | "false"; // "false" = only leads with no person_campaigns
  /** Preset: "7d" | "30d", or use time_from/time_to for custom */
  time?: "7d" | "30d" | "custom";
  time_from?: string;
  time_to?: string;
  sort?: "name" | "email" | "company" | "job_title" | "last_activity";
  order?: SortDir;
  page?: number;
  pageSize?: number;
}

export interface InteractionsListParams extends PeopleFilters {
  campaign?: string[];
  client?: string[];
  status?: string[];
  dnc?: "true" | "false";
  /** Preset: "7d" | "30d", or use time_from/time_to for custom */
  time?: "7d" | "30d" | "custom";
  time_from?: string;
  time_to?: string;
  /** Exact-match email filter (people.email) */
  email?: string;
  sort?: SortField;
  order?: SortDir;
  page?: number;
  pageSize?: number;
}
