ALTER TABLE characters
ADD COLUMN progression TEXT DEFAULT '{"total_experience":0,"current_level":0,"skills":[]}';