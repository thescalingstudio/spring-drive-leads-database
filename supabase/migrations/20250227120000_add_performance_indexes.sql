-- Performance indexes for leads database (people, person_campaigns, touch_events)
-- Run this in Supabase SQL Editor or via: supabase db push
-- Safe to run multiple times (IF NOT EXISTS).

-- people: email lookups (interactions filter, lead lookup) and sort
CREATE INDEX IF NOT EXISTS idx_people_email ON people (email);
CREATE INDEX IF NOT EXISTS idx_people_created_at ON people (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_updated_at ON people (updated_at DESC);

-- person_campaigns: filters and joins (client_id, campaign_id, status, date fields)
CREATE INDEX IF NOT EXISTS idx_person_campaigns_person_id ON person_campaigns (person_id);
CREATE INDEX IF NOT EXISTS idx_person_campaigns_campaign_id ON person_campaigns (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_campaigns_esp_client_id ON person_campaigns (esp_client_id) WHERE esp_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_campaigns_status ON person_campaigns (status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_campaigns_last_contacted_at ON person_campaigns (last_contacted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_person_campaigns_last_reply_at ON person_campaigns (last_reply_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_person_campaigns_created_at ON person_campaigns (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_person_campaigns_updated_at ON person_campaigns (updated_at DESC);

-- person_campaigns: composite indexes for common filter + sort combinations
CREATE INDEX IF NOT EXISTS idx_person_campaigns_status_last_contacted ON person_campaigns (status, last_contacted_at DESC NULLS LAST) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_campaigns_campaign_name ON person_campaigns (campaign_name) WHERE campaign_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_campaigns_esp_client_name ON person_campaigns (esp_client_name) WHERE esp_client_name IS NOT NULL;

-- touch_events: join and sort
CREATE INDEX IF NOT EXISTS idx_touch_events_person_campaign_id ON touch_events (person_campaign_id);
CREATE INDEX IF NOT EXISTS idx_touch_events_occurred_at ON touch_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_touch_events_created_at ON touch_events (created_at DESC);
