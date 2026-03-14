import Link from "next/link";
import { getLeadDetail } from "@/lib/queries/lead-detail";
import { CampaignRecord } from "@/components/CampaignRecord";
import type { Person, PersonCampaign, TouchEvent } from "@/lib/types";

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function LeadProfile({ person }: { person: Person }) {
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || person.email;
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">Profile</h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><dt className="text-xs text-gray-500">Name</dt><dd className="font-medium text-gray-900">{name}</dd></div>
        <div><dt className="text-xs text-gray-500">Email</dt><dd className="text-gray-900">{person.email}</dd></div>
        <div><dt className="text-xs text-gray-500">Company</dt><dd className="text-gray-900">{person.company ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">Domain</dt><dd className="text-gray-900">{person.domain ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">Job title</dt><dd className="text-gray-900">{person.job_title ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">Company size</dt><dd className="text-gray-900">{person.company_size ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">Industry</dt><dd className="text-gray-900">{person.industry ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">Location</dt><dd className="text-gray-900">{person.lead_location ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">LinkedIn</dt><dd className="text-gray-900">{person.linkedin_url ? <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{person.linkedin_url}</a> : "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">Source</dt><dd className="text-gray-900">{person.source ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">Timezone</dt><dd className="text-gray-900">{person.timezone ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">Validation</dt><dd className="text-gray-900">{person.validation ?? "—"}</dd></div>
        <div><dt className="text-xs text-gray-500">Created</dt><dd className="text-gray-600">{formatDate(person.created_at)}</dd></div>
        <div><dt className="text-xs text-gray-500">Updated</dt><dd className="text-gray-600">{formatDate(person.updated_at)}</dd></div>
      </dl>
    </div>
  );
}

/** Group touch events by person_campaign_id */
function groupTouchEventsByCampaign(events: TouchEvent[]): Map<string, TouchEvent[]> {
  const map = new Map<string, TouchEvent[]>();
  for (const e of events) {
    const list = map.get(e.person_campaign_id) ?? [];
    list.push(e);
    map.set(e.person_campaign_id, list);
  }
  return map;
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { person, campaigns, touchEvents } = await getLeadDetail(id);

  if (!person) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        Lead not found.
        <br />
        <Link href="/" className="mt-2 inline-block text-sm text-gray-900 hover:underline">Back to Leads</Link>
      </div>
    );
  }

  const eventsByCampaign = groupTouchEventsByCampaign(touchEvents);

  return (
    <>
      <Link href="/" className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-900">← Back to Leads</Link>
      <div className="space-y-8">
        <LeadProfile person={person} />
        <div>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">Campaigns & activity</h2>
          <p className="mb-4 text-sm text-gray-500">Lead status per campaign and client. Open a record to see touch events for that campaign.</p>
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="rounded-xl border border-gray-200/80 bg-white p-6 text-center text-gray-500 text-sm">No campaigns for this lead.</div>
            ) : (
              campaigns.map((c) => (
                <CampaignRecord
                  key={c.id}
                  campaign={c}
                  touchEvents={eventsByCampaign.get(c.id) ?? []}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
