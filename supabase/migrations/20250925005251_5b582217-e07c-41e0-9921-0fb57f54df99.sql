-- Fix the case status for the specific case that was already submitted
UPDATE cases 
SET status = 'submitted', 
    step = 4, 
    updated_at = now() 
WHERE id = '048d122c-b431-441e-81b3-d73dde0bd2cf' AND status = 'intake';