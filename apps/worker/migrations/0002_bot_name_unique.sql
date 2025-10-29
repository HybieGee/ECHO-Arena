-- Migration: Add unique constraint on bot_name
-- Date: 2025-10-29
-- Description: Ensure all bot names are unique across the entire platform

-- Create a case-insensitive unique index on bot_name
-- This prevents multiple bots from having the same name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bots_bot_name_unique ON bots(LOWER(bot_name));
