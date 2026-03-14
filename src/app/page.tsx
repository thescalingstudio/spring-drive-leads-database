import { Suspense } from "react";
import { FilterBar } from "@/components/FilterBar";
import { LeadsTable } from "@/components/LeadsTable";
import { Pagination } from "@/components/Pagination";
import { ExportButton } from "@/components/ExportButton";
import { getFilterOptions, getUniqueLeadsList } from "@/lib/queries/leads";
import type { LeadsListParams, SortDir } from "@/lib/types";

type LeadsSort = LeadsListParams["sort"];

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseMulti(val: string | string[] | undefined): string[] | undefined {
  if (typeof val !== "string" || !val) return undefined;
  return val.split(",").filter(Boolean);
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const campaign = parseMulti(params.campaign);
  const client = parseMulti(params.client);
  const status = parseMulti(params.status);
  const has_interactions = typeof params.has_interactions === "string" ? (params.has_interactions as "true" | "false") : undefined;
  const time = typeof params.time === "string" ? (params.time as "7d" | "30d" | "custom") : undefined;
  const time_from = typeof params.time_from === "string" ? params.time_from : undefined;
  const time_to = typeof params.time_to === "string" ? params.time_to : undefined;
  const sort = (typeof params.sort === "string" ? params.sort : undefined) as LeadsSort;
  const order = (typeof params.order === "string" ? params.order : undefined) as SortDir | undefined;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : undefined;
  const pageSize = typeof params.pageSize === "string" ? parseInt(params.pageSize, 10) : undefined;

  // People-table filters
  const esp = parseMulti(params.esp);
  const lead_country = parseMulti(params.lead_country);
  const industry = parseMulti(params.industry);
  const job_title_filter = parseMulti(params.job_title_filter);
  const timezone = parseMulti(params.timezone);
  const emp_min = typeof params.emp_min === "string" && params.emp_min ? parseInt(params.emp_min, 10) : undefined;
  const emp_max = typeof params.emp_max === "string" && params.emp_max ? parseInt(params.emp_max, 10) : undefined;

  let filterOptions: Awaited<ReturnType<typeof getFilterOptions>>;
  let leadsResult: Awaited<ReturnType<typeof getUniqueLeadsList>>;

  try {
    [filterOptions, leadsResult] = await Promise.all([
      getFilterOptions(),
      getUniqueLeadsList({
        campaign, client, status, has_interactions, time, time_from, time_to, sort, order, page, pageSize,
        esp, lead_country, industry, job_title_filter, timezone, emp_min, emp_max,
      }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Missing env")) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="font-medium">Supabase not configured</p>
          <p className="mt-1 text-sm">Copy <code className="rounded bg-amber-100 px-1">.env.local.example</code> to <code className="rounded bg-amber-100 px-1">.env.local</code> and set <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.</p>
        </div>
      );
    }
    throw err;
  }

  const baseParams = new URLSearchParams();
  if (campaign?.length) baseParams.set("campaign", campaign.join(","));
  if (client?.length) baseParams.set("client", client.join(","));
  if (status?.length) baseParams.set("status", status.join(","));
  if (has_interactions) baseParams.set("has_interactions", has_interactions);
  if (time) baseParams.set("time", time);
  if (time_from) baseParams.set("time_from", time_from);
  if (time_to) baseParams.set("time_to", time_to);
  if (esp?.length) baseParams.set("esp", esp.join(","));
  if (lead_country?.length) baseParams.set("lead_country", lead_country.join(","));
  if (industry?.length) baseParams.set("industry", industry.join(","));
  if (job_title_filter?.length) baseParams.set("job_title_filter", job_title_filter.join(","));
  if (timezone?.length) baseParams.set("timezone", timezone.join(","));
  if (emp_min != null) baseParams.set("emp_min", String(emp_min));
  if (emp_max != null) baseParams.set("emp_max", String(emp_max));
  if (sort) baseParams.set("sort", sort);
  if (order) baseParams.set("order", order);
  baseParams.set("pageSize", String(leadsResult.pageSize));

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Leads</h1>
        <ExportButton
          source="leads"
          filters={{
            campaign: campaign?.join(","), client: client?.join(","), status: status?.join(","),
            has_interactions, time, time_from, time_to,
            esp: esp?.join(","), lead_country: lead_country?.join(","), industry: industry?.join(","),
            job_title_filter: job_title_filter?.join(","), timezone: timezone?.join(","),
            emp_min: emp_min != null ? String(emp_min) : undefined,
            emp_max: emp_max != null ? String(emp_max) : undefined,
          }}
          total={leadsResult.total}
        />
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Unique leads in the database. Open a lead to see all their interactions across campaigns and clients.
      </p>
      <Suspense fallback={<div className="mb-6 h-12 animate-pulse rounded-xl bg-gray-100" />}>
        <FilterBar
          campaigns={filterOptions.campaigns}
          clients={filterOptions.clients}
          statuses={filterOptions.statuses}
          esps={filterOptions.esps}
          timezones={filterOptions.timezones}
          countries={filterOptions.countries}
          industries={filterOptions.industries}
          jobTitles={filterOptions.jobTitles}
          variant="leads"
          basePath="/"
        />
      </Suspense>
      <LeadsTable
        rows={leadsResult.rows}
        sortField={sort}
        sortOrder={order}
        baseParams={baseParams}
      />
      <Pagination
        page={leadsResult.page}
        pageSize={leadsResult.pageSize}
        total={leadsResult.total}
        baseParams={baseParams}
        basePath="/"
      />
    </>
  );
}
