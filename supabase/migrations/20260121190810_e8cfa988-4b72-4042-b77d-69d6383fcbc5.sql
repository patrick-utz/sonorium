-- Persist audiophile profile (including shop preferences) per authenticated user
CREATE TABLE IF NOT EXISTS public.audiophile_profiles (
  user_id uuid PRIMARY KEY,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audiophile_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: each user can only access their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'audiophile_profiles' AND policyname = 'Users can view their own audiophile profile'
  ) THEN
    CREATE POLICY "Users can view their own audiophile profile"
    ON public.audiophile_profiles
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'audiophile_profiles' AND policyname = 'Users can insert their own audiophile profile'
  ) THEN
    CREATE POLICY "Users can insert their own audiophile profile"
    ON public.audiophile_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'audiophile_profiles' AND policyname = 'Users can update their own audiophile profile'
  ) THEN
    CREATE POLICY "Users can update their own audiophile profile"
    ON public.audiophile_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'audiophile_profiles' AND policyname = 'Users can delete their own audiophile profile'
  ) THEN
    CREATE POLICY "Users can delete their own audiophile profile"
    ON public.audiophile_profiles
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_audiophile_profiles_updated_at ON public.audiophile_profiles;
CREATE TRIGGER update_audiophile_profiles_updated_at
BEFORE UPDATE ON public.audiophile_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
