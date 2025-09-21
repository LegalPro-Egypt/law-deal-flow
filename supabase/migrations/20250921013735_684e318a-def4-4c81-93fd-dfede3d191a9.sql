-- Add RLS policies for lawyers to access their assigned cases
CREATE POLICY "Lawyers can view assigned cases" ON cases 
FOR SELECT USING (assigned_lawyer_id = auth.uid());

CREATE POLICY "Lawyers can update assigned cases" ON cases 
FOR UPDATE USING (assigned_lawyer_id = auth.uid());