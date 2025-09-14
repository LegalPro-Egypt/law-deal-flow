-- Create comprehensive database schema for AI Legal Chatbot

-- Cases table for storing legal cases
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_number TEXT NOT NULL UNIQUE DEFAULT 'CASE-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' || LPAD(EXTRACT(HOUR FROM NOW())::TEXT, 2, '0') || LPAD(EXTRACT(MINUTE FROM NOW())::TEXT, 2, '0'),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'assigned', 'in_progress', 'delivered', 'closed')),
  jurisdiction TEXT NOT NULL DEFAULT 'egypt',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar', 'de')),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  assigned_lawyer_id UUID,
  assigned_admin_id UUID,
  extracted_entities JSONB DEFAULT '{}',
  ai_summary TEXT,
  consultation_fee DECIMAL(10,2),
  remaining_fee DECIMAL(10,2),
  total_fee DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversations table for AI chat sessions
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'intake' CHECK (mode IN ('qa', 'intake')),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar', 'de')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table for storing chat messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'question', 'answer')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents table for case documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_category TEXT,
  is_required BOOLEAN DEFAULT false,
  ocr_text TEXT,
  extracted_data JSONB DEFAULT '{}',
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Egyptian legal knowledge base
CREATE TABLE public.legal_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  law_reference TEXT,
  article_number TEXT,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  keywords TEXT[],
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Case categories for Egyptian jurisdiction
CREATE TABLE public.case_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_de TEXT,
  parent_id UUID REFERENCES public.case_categories(id),
  description TEXT,
  required_documents TEXT[],
  typical_timeline TEXT,
  urgency_indicators TEXT[],
  applicable_laws TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'lawyer', 'admin')),
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'ar', 'de')),
  specializations TEXT[],
  jurisdictions TEXT[],
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cases
CREATE POLICY "Users can view their own cases" ON public.cases FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own cases" ON public.cases FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own cases" ON public.cases FOR UPDATE USING (auth.uid()::text = user_id::text);

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" ON public.conversations FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- RLS Policies for messages
CREATE POLICY "Users can view messages from their conversations" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id::text = auth.uid()::text
  )
);
CREATE POLICY "Users can create messages in their conversations" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id::text = auth.uid()::text
  )
);

-- RLS Policies for documents
CREATE POLICY "Users can view documents from their cases" ON public.documents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = documents.case_id 
    AND cases.user_id::text = auth.uid()::text
  )
);

-- RLS Policies for legal knowledge (public read)
CREATE POLICY "Legal knowledge is viewable by everyone" ON public.legal_knowledge FOR SELECT USING (is_active = true);

-- RLS Policies for case categories (public read)
CREATE POLICY "Case categories are viewable by everyone" ON public.case_categories FOR SELECT USING (is_active = true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Create indexes for better performance
CREATE INDEX idx_cases_user_id ON public.cases(user_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_category ON public.cases(category);
CREATE INDEX idx_conversations_case_id ON public.conversations(case_id);
CREATE INDEX idx_conversations_session_id ON public.conversations(session_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_documents_case_id ON public.documents(case_id);
CREATE INDEX idx_legal_knowledge_category ON public.legal_knowledge(category);
CREATE INDEX idx_legal_knowledge_keywords ON public.legal_knowledge USING GIN(keywords);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_legal_knowledge_updated_at BEFORE UPDATE ON public.legal_knowledge FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data for Egyptian legal categories
INSERT INTO public.case_categories (name, name_ar, description, required_documents, applicable_laws) VALUES
('Family Law', 'قانون الأحوال الشخصية', 'Marriage, divorce, custody, inheritance matters', 
 ARRAY['Marriage Certificate', 'ID Cards', 'Birth Certificates'], 
 ARRAY['Personal Status Law No. 25/1929', 'Law No. 100/1985']),
('Immigration Law', 'قانون الهجرة', 'Visa, residency, citizenship applications',
 ARRAY['Passport', 'Visa Application', 'Sponsor Documents'],
 ARRAY['Immigration Law No. 89/1960', 'Entry and Residence Law']),
('Real Estate Law', 'قانون العقارات', 'Property transactions, contracts, disputes',
 ARRAY['Property Deed', 'Survey Report', 'Tax Clearance'],
 ARRAY['Civil Code', 'Real Estate Registration Law']),
('Labor Law', 'قانون العمل', 'Employment disputes, contracts, termination',
 ARRAY['Employment Contract', 'Salary Statements', 'Termination Notice'],
 ARRAY['Labor Law No. 12/2003']),
('Commercial Law', 'القانون التجاري', 'Business formation, contracts, disputes',
 ARRAY['Commercial Registration', 'Articles of Incorporation', 'Financial Statements'],
 ARRAY['Commercial Law No. 17/1999', 'Companies Law No. 159/1981']),
('Criminal Law', 'القانون الجنائي', 'Criminal defense, procedures, appeals',
 ARRAY['Police Report', 'Evidence Documents', 'Witness Statements'],
 ARRAY['Penal Code', 'Criminal Procedure Code']);

-- Insert seed Egyptian legal knowledge
INSERT INTO public.legal_knowledge (category, title, content, law_reference, language) VALUES
('Family Law', 'Marriage Requirements in Egypt', 'Marriage in Egypt requires: 1) Legal capacity of both parties, 2) Mutual consent, 3) Presence of witnesses, 4) Marriage contract registration', 'Personal Status Law No. 25/1929, Article 1', 'en'),
('Family Law', 'Divorce Procedures', 'Divorce can be initiated by: 1) Mutual consent (Mubarat), 2) Husband''s unilateral decision (Talaq), 3) Court order upon wife''s request (Khula)', 'Personal Status Law, Articles 20-25', 'en'),
('Immigration Law', 'Egypt Residence Visa', 'Foreigners can obtain residence visa by: 1) Investment (minimum $100,000), 2) Employment, 3) Family reunification, 4) Real estate purchase', 'Immigration Law No. 89/1960', 'en'),
('Real Estate Law', 'Property Purchase by Foreigners', 'Foreigners can purchase property in Egypt with restrictions: 1) Maximum 2 residential units, 2) Must reside in Egypt at least 6 months/year, 3) Cannot exceed 4,000 m² area', 'Law No. 230/1996', 'en'),
('Labor Law', 'Employment Contract Requirements', 'Employment contracts must include: 1) Job description, 2) Salary details, 3) Working hours, 4) Probation period (max 3 months), 5) Termination conditions', 'Labor Law No. 12/2003, Article 33', 'en');