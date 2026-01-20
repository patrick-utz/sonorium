-- Create records table for cloud storage
CREATE TABLE public.records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  year INTEGER NOT NULL,
  genre TEXT[] NOT NULL DEFAULT '{}',
  label TEXT,
  catalog_number TEXT,
  format TEXT NOT NULL DEFAULT 'vinyl',
  format_details TEXT,
  pressing TEXT,
  cover_art TEXT,
  my_rating INTEGER DEFAULT 3,
  recording_quality INTEGER,
  mastering_quality INTEGER,
  artistic_rating INTEGER,
  critic_score INTEGER,
  critic_reviews JSONB,
  status TEXT NOT NULL DEFAULT 'owned',
  date_added DATE NOT NULL DEFAULT CURRENT_DATE,
  purchase_price NUMERIC,
  purchase_location TEXT,
  vinyl_recommendation TEXT,
  recommendation_reason TEXT,
  personal_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  moods TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  audiophile_assessment TEXT,
  artistic_assessment TEXT,
  recommendations JSONB,
  streaming_links JSONB,
  alternative_releases JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own records
CREATE POLICY "Users can view their own records"
  ON public.records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own records"
  ON public.records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON public.records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own records"
  ON public.records FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_records_user_id ON public.records(user_id);
CREATE INDEX idx_records_status ON public.records(status);
CREATE INDEX idx_records_is_favorite ON public.records(is_favorite);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON public.records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();