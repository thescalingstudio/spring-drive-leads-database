"use client";

import { useState } from "react";
import type { PersonCampaign, TouchEvent } from "@/lib/types";
import { formatStatus } from "@/lib/format";

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

interface CampaignRecordProps {
  campaign: PersonCampaign;
  touchEvents: TouchEvent[];
}

export function CampaignRecord({ campaign, touchEvents }: CampaignRecordProps) {
  const [open, setOpen] = useState(false);
  const sortedEvents = [...touchEvents].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors"
      >
        <span className="text-gray-400">{open ? "▼" : "▶"}</span>
        <span className="min-w-[140px] font-medium text-gray-900">{campaign.campaign_name ?? "—"}</span>
        <span className="min-w-[120px] text-sm text-gray-600">{campaign.esp_client_name ?? "—"}</span>
        {campaign.status ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{formatStatus(campaign.status)}</span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
        <span className="text-sm text-gray-500">{formatDate(campaign.last_contacted_at)}</span>
        <span className="text-sm text-gray-500">{formatDate(campaign.last_reply_at)}</span>
        {campaign.last_reply_type && <span className="text-xs text-gray-500">({campaign.last_reply_type})</span>}
        {campaign.dnc && <span className="text-amber-600 text-xs">DNC</span>}
        <span className="ml-auto text-xs text-gray-400">
          {touchEvents.length} touch{touchEvents.length === 1 ? "" : "es"}
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-200/80 bg-gray-50/50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Touch events (this campaign)</div>
          {sortedEvents.length === 0 ? (
            <p className="text-sm text-gray-500">No touch events</p>
          ) : (
            <ul className="space-y-3">
              {sortedEvents.map((e) => (
                <li key={e.id} className="border-l-2 border-gray-200 pl-3 py-1">
                  <div className="text-xs text-gray-500">{formatDate(e.occurred_at)} · {e.direction ?? "—"}</div>
                  {e.reply_classification && <div className="mt-0.5 text-sm font-medium text-gray-700">{e.reply_classification}</div>}
                  {e.raw_subject && <div className="mt-0.5 text-sm text-gray-600 truncate max-w-2xl">{e.raw_subject}</div>}
                  {e.raw_body_snippet && <div className="mt-1 text-xs text-gray-500 line-clamp-2">{e.raw_body_snippet}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
