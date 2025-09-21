-- Add bilingual AI summary columns to cases table
ALTER TABLE cases 
ADD COLUMN ai_summary_en TEXT,
ADD COLUMN ai_summary_ar TEXT;