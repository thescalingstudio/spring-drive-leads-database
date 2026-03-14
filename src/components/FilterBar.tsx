"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { formatStatus } from "@/lib/format";

interface FilterBarProps {
  campaigns: string[];
  clients: string[];
  statuses: string[];
  esps: string[];
  timezones: string[];
  countries: string[];
  industries: string[];
  jobTitles: string[];
  /** For Leads page: show has_interactions and campaign/client/status. For Interactions: full set including DNC, time, email. */
  variant: "leads" | "interactions";
  basePath?: string;
}

export function FilterBar({
  campaigns,
  clients,
  statuses,
  esps,
  timezones,
  countries,
  industries,
  jobTitles,
  variant,
  basePath = "/",
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailInput, setEmailInput] = useState(searchParams.get("email") ?? "");
  const [empMinInput, setEmpMinInput] = useState(searchParams.get("emp_min") ?? "");
  const [empMaxInput, setEmpMaxInput] = useState(searchParams.get("emp_max") ?? "");

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      const base = basePath.replace(/\?.*$/, "");
      const q = next.toString();
      router.push(q ? `${base}?${q}` : base);
    },
    [searchParams, basePath, router]
  );

  /** Update a multi-select param (comma-separated in URL) */
  const updateMultiParam = useCallback(
    (key: string, values: string[]) => {
      const next = new URLSearchParams(searchParams);
      if (values.length > 0) next.set(key, values.join(","));
      else next.delete(key);
      next.delete("page");
      const base = basePath.replace(/\?.*$/, "");
      const q = next.toString();
      router.push(q ? `${base}?${q}` : base);
    },
    [searchParams, basePath, router]
  );

  function applyEmailFilter() {
    const trimmed = emailInput.trim();
    updateParam("email", trimmed || null);
    setEmailInput(trimmed);
  }

  const timePreset = searchParams.get("time") ?? "";
  const timeFrom = searchParams.get("time_from") ?? "";
  const timeTo = searchParams.get("time_to") ?? "";
  const isCustomTime = timePreset === "custom";

  function setTimePreset(value: string) {
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    next.delete("time");
    next.delete("time_from");
    next.delete("time_to");
    if (value) next.set("time", value);
    const base = basePath.replace(/\?.*$/, "");
    const q = next.toString();
    router.push(q ? `${base}?${q}` : base);
  }

  function setTimeRange(from: string | null, to: string | null) {
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    next.set("time", "custom");
    if (from) next.set("time_from", from);
    else next.delete("time_from");
    if (to) next.set("time_to", to);
    else next.delete("time_to");
    const base = basePath.replace(/\?.*$/, "");
    const q = next.toString();
    router.push(q ? `${base}?${q}` : base);
  }

  /** Parse comma-separated URL param into array */
  function getMultiParam(key: string): string[] {
    const raw = searchParams.get(key);
    if (!raw) return [];
    return raw.split(",").filter(Boolean);
  }

  const selectClass =
    "rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300";

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
      {/* Row 1: campaign-level filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Filters</span>
        {variant === "interactions" && (
          <span className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Email (exact match)"
              className="min-w-[180px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyEmailFilter()}
            />
            <button
              type="button"
              onClick={applyEmailFilter}
              className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              Apply
            </button>
          </span>
        )}
        {variant === "leads" && (
          <select
            className={selectClass}
            value={searchParams.get("has_interactions") ?? ""}
            onChange={(e) => updateParam("has_interactions", e.target.value || null)}
          >
            <option value="">All leads</option>
            <option value="true">Has interactions</option>
            <option value="false">Not contacted yet</option>
          </select>
        )}

        {/* Campaign: multi-select with suggestions */}
        <MultiSelectFilter
          label="Campaign"
          options={campaigns}
          selected={getMultiParam("campaign")}
          onChange={(v) => updateMultiParam("campaign", v)}
        />

        {/* Client: multi-select with suggestions */}
        <MultiSelectFilter
          label="Client"
          options={clients}
          selected={getMultiParam("client")}
          onChange={(v) => updateMultiParam("client", v)}
        />

        {/* Status: multi-select with suggestions */}
        <MultiSelectFilter
          label="Status"
          options={statuses}
          selected={getMultiParam("status")}
          onChange={(v) => updateMultiParam("status", v)}
          formatLabel={formatStatus}
        />

        <select
          className={selectClass}
          value={timePreset || (isCustomTime ? "custom" : "")}
          onChange={(e) => setTimePreset(e.target.value || "")}
        >
          <option value="">Any time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
        {isCustomTime && (
          <>
            <input
              type="date"
              className={selectClass}
              value={timeFrom}
              onChange={(e) => setTimeRange(e.target.value || null, timeTo || null)}
            />
            <input
              type="date"
              className={selectClass}
              value={timeTo}
              onChange={(e) => setTimeRange(timeFrom || null, e.target.value || null)}
            />
          </>
        )}
        {variant === "interactions" && (
          <select
            className={selectClass}
            value={searchParams.get("dnc") ?? ""}
            onChange={(e) => updateParam("dnc", e.target.value || null)}
          >
            <option value="">DNC: any</option>
            <option value="false">Exclude DNC</option>
            <option value="true">DNC only</option>
          </select>
        )}
      </div>

      {/* Row 2: people-table filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* ESP: multi-select with suggestions */}
        <MultiSelectFilter
          label="ESP"
          options={esps}
          selected={getMultiParam("esp")}
          onChange={(v) => updateMultiParam("esp", v)}
        />

        {/* Lead country: suggestions + custom input */}
        <MultiSelectFilter
          label="Lead location"
          options={countries}
          selected={getMultiParam("lead_country")}
          onChange={(v) => updateMultiParam("lead_country", v)}
        />

        {/* Industry: suggestions + custom input */}
        <MultiSelectFilter
          label="Industry"
          options={industries}
          selected={getMultiParam("industry")}
          onChange={(v) => updateMultiParam("industry", v)}
        />

        {/* Job title: suggestions + custom input */}
        <MultiSelectFilter
          label="Job title"
          options={jobTitles}
          selected={getMultiParam("job_title_filter")}
          onChange={(v) => updateMultiParam("job_title_filter", v)}
        />

        {/* Time zone: multi-select with suggestions */}
        <MultiSelectFilter
          label="Time zone"
          options={timezones}
          selected={getMultiParam("timezone")}
          onChange={(v) => updateMultiParam("timezone", v)}
        />

        {/* Employee count: min / max range */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Employees</span>
          <input
            type="number"
            placeholder="Min"
            className="w-[72px] rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
            value={empMinInput}
            onChange={(e) => setEmpMinInput(e.target.value)}
            onBlur={() => updateParam("emp_min", empMinInput || null)}
            onKeyDown={(e) => e.key === "Enter" && updateParam("emp_min", empMinInput || null)}
          />
          <span className="text-xs text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max"
            className="w-[72px] rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
            value={empMaxInput}
            onChange={(e) => setEmpMaxInput(e.target.value)}
            onBlur={() => updateParam("emp_max", empMaxInput || null)}
            onKeyDown={(e) => e.key === "Enter" && updateParam("emp_max", empMaxInput || null)}
          />
        </div>
      </div>
    </div>
  );
}
