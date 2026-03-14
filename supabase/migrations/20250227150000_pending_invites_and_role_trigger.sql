-- Pending invites: store email + role before inviting; trigger uses this when user accepts.
-- Run after 20250227140000_auth_profiles.sql

-- Table: public.pending_invites (admin adds email + role, then we invite; on accept, trigger uses role)
CREATE TABLE IF NOT EXISTS public.pending_invites (
  email text PRIMARY KEY,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Only service role / server should insert/delete (no RLS needed for server-side only use)
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- No public policies: only server with service_role key will use this table

COMMENT ON TABLE public.pending_invites IS 'Stores intended role for invited users; trigger reads and deletes on auth signup.';

-- Update trigger: when a new auth user is created, use role from pending_invites if present
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_role text;
BEGIN
  SELECT role INTO invite_role
  FROM public.pending_invites
  WHERE email = LOWER(COALESCE(NEW.raw_user_meta_data->>'email', NEW.email));

  DELETE FROM public.pending_invites
  WHERE email = LOWER(COALESCE(NEW.raw_user_meta_data->>'email', NEW.email));

  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    COALESCE(invite_role, 'user')
  );
  RETURN NEW;
END;
$$;
