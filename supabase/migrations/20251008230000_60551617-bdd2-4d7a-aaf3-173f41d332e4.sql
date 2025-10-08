-- Create contract_history table to store all versions
CREATE TABLE IF NOT EXISTS public.contract_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content_en text,
  content_ar text,
  status text NOT NULL,
  admin_notes text,
  change_notes text,
  change_source text,
  client_change_request text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_history
CREATE POLICY "Admins can view all contract history"
  ON public.contract_history
  FOR SELECT
  USING (has_admin_role());

CREATE POLICY "Lawyers can view history of their contracts"
  ON public.contract_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contracts.id = contract_history.contract_id
      AND contracts.lawyer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view history of their contracts"
  ON public.contract_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contracts.id = contract_history.contract_id
      AND contracts.client_id = auth.uid()
    )
  );

-- Create trigger function to save contract versions before updates
CREATE OR REPLACE FUNCTION public.save_contract_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only save if there are actual content or status changes
  IF (OLD.content_en IS DISTINCT FROM NEW.content_en) OR
     (OLD.content_ar IS DISTINCT FROM NEW.content_ar) OR
     (OLD.status IS DISTINCT FROM NEW.status) OR
     (OLD.admin_notes IS DISTINCT FROM NEW.admin_notes) THEN
    
    INSERT INTO public.contract_history (
      contract_id,
      version,
      content_en,
      content_ar,
      status,
      admin_notes,
      change_notes,
      change_source,
      client_change_request,
      created_by,
      metadata
    ) VALUES (
      OLD.id,
      OLD.version,
      OLD.content_en,
      OLD.content_ar,
      OLD.status,
      OLD.admin_notes,
      OLD.change_notes,
      OLD.change_source,
      OLD.client_change_request,
      auth.uid(),
      OLD.metadata
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically save versions before updates
DROP TRIGGER IF EXISTS trigger_save_contract_version ON public.contracts;
CREATE TRIGGER trigger_save_contract_version
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.save_contract_version();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id ON public.contract_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_version ON public.contract_history(contract_id, version DESC);