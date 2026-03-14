-- Profiles: one row per auth user with role (admin | user).
-- Run in Supabase SQL Editor or: supabase db push

-- Table: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for listing by role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- Trigger: create profile on signup (default role 'user')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users (if any) so they get a profile
INSERT INTO public.profiles (id, email, role)
SELECT id, COALESCE(raw_user_meta_data->>'email', email), 'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Only admins can read all profiles (for user management)
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Only admins can update profiles (e.g. change role; remove access is done via auth.admin.deleteUser)
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Users can insert their own profile (trigger runs in signup context with auth.uid() = new user)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Only admins can delete profiles (e.g. when removing a user)
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Allow service role to do anything (bypasses RLS when using service_role key)
-- No extra policy needed; service role bypasses RLS by default.

COMMENT ON TABLE public.profiles IS 'App user profiles; id matches auth.users. role: admin | user.';

-- To make a user an admin, run in SQL Editor (after they have signed up):
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'their@email.com';
