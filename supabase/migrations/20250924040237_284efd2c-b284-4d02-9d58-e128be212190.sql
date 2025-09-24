-- Add columns to support PDF proposal uploads
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS uploaded_pdf_url TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_type TEXT DEFAULT 'generated' CHECK (proposal_type IN ('generated', 'uploaded'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_proposals_type ON proposals(proposal_type);

-- Update RLS policies to ensure uploaded PDFs are properly secured
-- The existing policies should already cover this since they check lawyer_id and case_id