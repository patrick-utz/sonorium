-- Künstler-Biografien Tabelle
CREATE TABLE public.artist_biographies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  artist_name TEXT NOT NULL,
  artist_name_normalized TEXT NOT NULL,
  artist_image TEXT,
  origin TEXT,
  active_years TEXT,
  genres TEXT[] DEFAULT '{}',
  short_bio TEXT,
  history TEXT,
  key_facts TEXT[] DEFAULT '{}',
  influences TEXT[] DEFAULT '{}',
  legacy TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, artist_name_normalized)
);

-- RLS aktivieren
ALTER TABLE public.artist_biographies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own biographies"
ON public.artist_biographies FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biographies"
ON public.artist_biographies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biographies"
ON public.artist_biographies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biographies"
ON public.artist_biographies FOR DELETE
USING (auth.uid() = user_id);

-- Trigger für updated_at
CREATE TRIGGER update_artist_biographies_updated_at
BEFORE UPDATE ON public.artist_biographies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index für schnelle Lookups
CREATE INDEX idx_artist_biographies_user_artist 
ON public.artist_biographies(user_id, artist_name_normalized);

CREATE INDEX idx_artist_biographies_updated 
ON public.artist_biographies(user_id, updated_at);