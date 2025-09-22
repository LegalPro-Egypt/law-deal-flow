-- Add foreign key constraint for proposals.case_id -> cases.id
ALTER TABLE proposals 
ADD CONSTRAINT fk_proposals_case_id 
FOREIGN KEY (case_id) REFERENCES cases(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_proposals_case_id ON proposals(case_id);