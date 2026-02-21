-- Add cover verification tracking columns to records table
-- This enables persistent storage of cover source, verification status, and AI confidence scores

ALTER TABLE records
ADD COLUMN IF NOT EXISTS cover_art_source VARCHAR(50);
-- Values: 'discogs'|'musicbrainz'|'itunes'|'deezer'|'user-upload'|'user-url'|'ai-extracted'|'simplified'
-- Tracks which service provided the cover art

ALTER TABLE records
ADD COLUMN IF NOT EXISTS cover_art_verified BOOLEAN DEFAULT false;
-- Tracks if user has manually verified cover matches selected pressing

ALTER TABLE records
ADD COLUMN IF NOT EXISTS cover_art_verified_at TIMESTAMP;
-- ISO timestamp of when cover was verified by user

ALTER TABLE records
ADD COLUMN IF NOT EXISTS ai_confidence VARCHAR(20);
-- Values: 'high'|'medium'|'low'
-- AI confidence score for auto-extracted cover or data

-- Also add missing purchase tracking columns
ALTER TABLE records
ADD COLUMN IF NOT EXISTS purchase_date DATE;
-- When user acquired this record

ALTER TABLE records
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2);
-- How much was paid for the record

ALTER TABLE records
ADD COLUMN IF NOT EXISTS purchase_location VARCHAR(255);
-- Where it was purchased (store name, online shop, etc.)

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_records_cover_verified
  ON records(cover_art_verified, cover_art_verified_at);

CREATE INDEX IF NOT EXISTS idx_records_cover_source
  ON records(cover_art_source);

CREATE INDEX IF NOT EXISTS idx_records_ai_confidence
  ON records(ai_confidence);
