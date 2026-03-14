"use server";

import { getLeadsForExport, getInteractionsForExport } from "@/lib/queries/export";
import type { ExportFilters, LeadExportRow, InteractionExportRow } from "@/lib/queries/export";

function escapeCSV(value: unknown): string {
  if (value == null) return "";
  // Serialize objects/arrays (e.g. custom_fields) to JSON
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((col) => escapeCSV(row[col])).join(","));
  return [header, ...body].join("\n");
}

const LEAD_COLUMNS: (keyof LeadExportRow)[] = [
  "email",
  "first_name",
  "last_name",
  "company",
  "job_title",
  "campaign_count",
  "last_activity_at",
  "domain",
  "company_size",
  "industry",
  "lead_location",
  "linkedin_url",
  "timezone",
  "esp",
  "source",
  "validation",
  "last_validated",
  "custom_fields",
  "id",
  "created_at",
  "updated_at",
];

const INTERACTION_COLUMNS: (keyof InteractionExportRow)[] = [
  "email",
  "first_name",
  "last_name",
  "company",
  "job_title",
  "campaign_name",
  "esp_client_name",
  "status",
  "last_contacted_at",
  "last_reply_at",
  "last_reply_type",
  "dnc",
  "domain",
  "company_size",
  "industry",
  "lead_location",
  "linkedin_url",
  "timezone",
  "esp",
  "source",
  "validation",
  "last_validated",
  "custom_fields",
  "person_id",
  "person_created_at",
  "person_updated_at",
  "campaign_record_id",
  "campaign_id",
  "esp_client_id",
  "campaign_created_at",
  "campaign_updated_at",
];

export async function exportLeadsAsCSV(filters: ExportFilters): Promise<string> {
  const rows = await getLeadsForExport(filters);
  return toCSV(rows as unknown as Record<string, unknown>[], LEAD_COLUMNS);
}

export async function exportInteractionsAsCSV(filters: ExportFilters): Promise<string> {
  const rows = await getInteractionsForExport(filters);
  return toCSV(rows as unknown as Record<string, unknown>[], INTERACTION_COLUMNS);
}
