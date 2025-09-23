-- Create indexes for better performance on read queries (if they don't exist already)
CREATE INDEX IF NOT EXISTS idx_case_messages_read_status ON public.case_messages(case_id, is_read, role);
CREATE INDEX IF NOT EXISTS idx_case_messages_unread_by_user ON public.case_messages(case_id, read_by) WHERE is_read = false;

-- Enable realtime for case_messages table
ALTER TABLE public.case_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_messages;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_case_messages_as_read(
  p_case_id UUID,
  p_user_id UUID,
  p_exclude_role TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE public.case_messages 
  SET 
    is_read = true,
    read_at = NOW(),
    read_by = p_user_id,
    updated_at = NOW()
  WHERE 
    case_id = p_case_id 
    AND is_read = false 
    AND (p_exclude_role IS NULL OR role != p_exclude_role);
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;