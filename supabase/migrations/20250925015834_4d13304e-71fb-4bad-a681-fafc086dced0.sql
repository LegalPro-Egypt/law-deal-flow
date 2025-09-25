-- Add the missing notification types to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'proposal_accepted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'proposal_sent';