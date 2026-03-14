import { supabase } from "@/lib/supabase-server";
import type { Person, PersonCampaign, TouchEvent } from "@/lib/types";

export async function getPersonById(id: string): Promise<Person | null> {
  const { data, error } = await supabase.from("people").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data as Person;
}

export async function getPersonCampaignsByPersonId(personId: string): Promise<PersonCampaign[]> {
  const { data } = await supabase
    .from("person_campaigns")
    .select("id, person_id, status, last_contacted_at, last_reply_at, last_reply_type, dnc, created_at, updated_at, campaign_id, campaign_name, esp_client_id, esp_client_name")
    .eq("person_id", personId)
    .order("last_contacted_at", { ascending: false, nullsFirst: false });
  return (data ?? []) as PersonCampaign[];
}

export async function getTouchEventsByPersonCampaignIds(
  personCampaignIds: string[]
): Promise<TouchEvent[]> {
  if (personCampaignIds.length === 0) return [];
  const { data } = await supabase
    .from("touch_events")
    .select("*")
    .in("person_campaign_id", personCampaignIds)
    .order("occurred_at", { ascending: false });
  return (data ?? []) as TouchEvent[];
}

export interface LeadDetailData {
  person: Person | null;
  campaigns: PersonCampaign[];
  touchEvents: TouchEvent[];
}

export async function getLeadDetail(id: string): Promise<LeadDetailData> {
  const person = await getPersonById(id);
  if (!person) {
    return { person: null, campaigns: [], touchEvents: [] };
  }
  const campaigns = await getPersonCampaignsByPersonId(id);
  const pcIds = campaigns.map((c) => c.id);
  const touchEvents = await getTouchEventsByPersonCampaignIds(pcIds);
  return { person, campaigns, touchEvents };
}
