-- Remove draft-related database functions and triggers
DROP FUNCTION IF EXISTS public.cleanup_duplicate_draft_cases() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_duplicate_drafts() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_admin_duplicate_cases() CASCADE;

-- Remove the trigger that was calling prevent_duplicate_drafts
DROP TRIGGER IF EXISTS prevent_duplicate_drafts_trigger ON public.cases;