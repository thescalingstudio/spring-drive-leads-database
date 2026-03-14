import { Suspense } from "react";
import { FilterBar } from "@/components/FilterBar";
import { InteractionsTable } from "@/components/InteractionsTable";
import { Pagination } from "@/components/Pagination";
import { ExportButton } from "@/components/ExportButton";
import { getFilterOptions, getInteractionsList } from "@/lib/queries/interactions";
import type { SortField, SortDir } from "@/lib/types";

interface InteractionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseMulti(val: string | string[] | undefined): string[] | undefined {
  if (typeof val !== "string" || !val) return undefined;
  return val.split(",").filter(Boolean);
}

export default async function InteractionsPage({ searchParams }: InteractionsPageProps) {
  const params = await searchParams;
  const campaign = parseMulti(params.campaign);
  const client = parseMulti(params.client);
  const status = parseMulti(params.status);
  const dnc = typeof params.dnc === "string" ? (params.dnc as "true" | "false") : undefined;
  const time = typeof params.time === "string" ? (params.time as "7d" | "30d" | "custom") : undefined;
  const time_from = typeof params.time_from === "string" ? params.time_from : undefined;
  const time_to = typeof params.time_to === "string" ? params.time_to : undefined;
  const email = typeof params.email === "string" ? params.email.trim() || undefined : undefined;
  const sort = (typeof params.sort === "string" ? params.sort : undefined) as SortField | undefined;
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
  let result: Awaited<ReturnType<typeof getInteractionsList>>;

  try {
    [filterOptions, result] = await Promise.all([
      getFilterOptions(),
      getInteractionsList({
        campaign, client, status, dnc, time, time_from, time_to, email, sort, order, page, pageSize,
        esp, lead_country, industry, job_title_filter, timezone, emp_min, emp_max,
      }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Missing env")) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="font-medium">Supabase not configured</p>
          <p className="mt-1 text-sm">Copy <code className="rounded bg-amber-100 px-1">.env.local.example</code> to <code className="rounded bg-amber-100 px-1">.env.local</code> and set the required keys.</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-medium">Failed to load interactions</p>
        <p className="mt-1 text-sm font-mono">{message}</p>
        <a href="/interactions" className="mt-3 inline-block text-sm font-medium underline">
          Try again without filters
        </a>
      </div>
    );
  }

  const baseParams = new URLSearchParams();
  if (campaign?.length) baseParams.set("campaign", campaign.join(","));
  if (client?.length) baseParams.set("client", client.join(","));
  if (status?.length) baseParams.set("status", status.join(","));
  if (dnc) baseParams.set("dnc", dnc);
  if (time) baseParams.set("time", time);
  if (time_from) baseParams.set("time_from", time_from);
  if (time_to) baseParams.set("time_to", time_to);
  if (email) baseParams.set("email", email);
  if (esp?.length) baseParams.set("esp", esp.join(","));
  if (lead_country?.length) baseParams.set("lead_country", lead_country.join(","));
  if (industry?.length) baseParams.set("industry", industry.join(","));
  if (job_title_filter?.length) baseParams.set("job_title_filter", job_title_filter.join(","));
  if (timezone?.length) baseParams.set("timezone", timezone.join(","));
  if (emp_min != null) baseParams.set("emp_min", String(emp_min));
  if (emp_max != null) baseParams.set("emp_max", String(emp_max));
  if (sort) baseParams.set("sort", sort);
  if (order) baseParams.set("order", order);
  baseParams.set("pageSize", String(result.pageSize));

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Interactions</h1>
        <ExportButton
          source="interactions"
          filters={{
            campaign: campaign?.join(","), client: client?.join(","), status: status?.join(","),
            dnc, time, time_from, time_to, email,
            esp: esp?.join(","), lead_country: lead_country?.join(","), industry: industry?.join(","),
            job_title_filter: job_title_filter?.join(","), timezone: timezone?.join(","),
            emp_min: emp_min != null ? String(emp_min) : undefined,
            emp_max: emp_max != null ? String(emp_max) : undefined,
          }}
          total={result.total}
        />
      </div>
      <p className="mb-6 text-sm text-gray-500">
        All outreach interactions across campaigns and clients. The same lead can appear multiple times (e.g. different clients). Filter by client, status, last contacted, interested, out of office, etc.
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
          variant="interactions"
          basePath="/interactions"
        />
      </Suspense>
      <InteractionsTable
        rows={result.rows}
        sortField={sort}
        sortOrder={order}
        baseParams={baseParams}
      />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        baseParams={baseParams}
        basePath="/interactions"
      />
    </>
  );
}
