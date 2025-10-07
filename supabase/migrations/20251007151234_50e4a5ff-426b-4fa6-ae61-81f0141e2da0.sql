-- Phase 1: Create contracts table with admin review workflow
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  
  -- Bilingual content
  content_en TEXT,
  content_ar TEXT,
  
  -- PDF tracking
  pdf_downloaded BOOLEAN DEFAULT false,
  downloaded_at TIMESTAMPTZ,
  
  -- Physical signature workflow
  dhl_tracking_number TEXT,
  expected_delivery_date DATE,
  shipment_notes TEXT,
  sent_for_signature_at TIMESTAMPTZ,
  physically_received_at TIMESTAMPTZ,
  received_by UUID,
  
  -- Admin review tracking
  admin_reviewed_by UUID,
  admin_reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  change_source TEXT,
  client_change_request TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  
  -- Version control
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.contracts(id),
  change_notes TEXT,
  
  -- Consultation notes integration
  consultation_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT valid_contract_status CHECK (status IN 
    ('draft', 'pending_admin_review', 'changes_requested', 
     'approved_by_admin', 'sent', 'viewed', 'downloaded', 
     'sent_for_signature', 'physically_signed', 'active'))
);

-- Create indexes for contracts
CREATE INDEX IF NOT EXISTS idx_contracts_proposal_id ON public.contracts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_contracts_case_id ON public.contracts(case_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_lawyer_id ON public.contracts(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts(client_id);

-- Enable RLS on contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contracts
CREATE POLICY "Lawyers can manage their contracts"
  ON public.contracts FOR ALL
  USING (lawyer_id = auth.uid() OR has_admin_role())
  WITH CHECK (lawyer_id = auth.uid() OR has_admin_role());

CREATE POLICY "Clients can view their contracts"
  ON public.contracts FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can update contract status"
  ON public.contracts FOR UPDATE
  USING (client_id = auth.uid());

CREATE POLICY "Admins can manage all contracts"
  ON public.contracts FOR ALL
  USING (has_admin_role())
  WITH CHECK (has_admin_role());

-- Update proposals table for bilingual content
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS content_en TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS content_ar TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en';

-- Update communication_sessions for consultation notes
ALTER TABLE public.communication_sessions ADD COLUMN IF NOT EXISTS consultation_notes TEXT;
ALTER TABLE public.communication_sessions ADD COLUMN IF NOT EXISTS notes_added_by UUID;
ALTER TABLE public.communication_sessions ADD COLUMN IF NOT EXISTS notes_added_at TIMESTAMPTZ;

-- Create trigger for contracts updated_at
CREATE OR REPLACE FUNCTION public.update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contracts_updated_at();