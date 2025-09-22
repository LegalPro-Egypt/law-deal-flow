interface CaseData {
  category?: string;
  summary?: string;
  title?: string;
  entities?: {
    [key: string]: any;
  };
}

export function generateCaseTitle(caseData: CaseData | null): string {
  if (!caseData) return 'New Case';
  
  // If there's already a meaningful title, use it
  if (caseData.title && caseData.title !== 'New Legal Inquiry' && caseData.title !== 'Legal Case') {
    return caseData.title;
  }
  
  // Use category as base
  const category = caseData.category || 'Legal Matter';
  
  // Try to add context from summary or entities
  if (caseData.summary) {
    const summary = caseData.summary.trim();
    if (summary.length > 0) {
      // Extract first meaningful phrase from summary (up to 40 characters)
      const shortSummary = summary.length > 40 
        ? summary.substring(0, 37) + '...' 
        : summary;
      return `${category}: ${shortSummary}`;
    }
  }
  
  // Try to use entities for context
  if (caseData.entities) {
    const entities = caseData.entities;
    if (entities.incident_type) {
      return `${category}: ${entities.incident_type}`;
    }
    if (entities.subject || entities.topic) {
      return `${category}: ${entities.subject || entities.topic}`;
    }
  }
  
  // Fallback to just category
  return category;
}

interface CaseCompletionStatus {
  isComplete: boolean;
  label: string;
  stepProgress: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}

export function getCaseCompletionStatus(caseItem: any): CaseCompletionStatus {
  const step = caseItem.step || 1;
  const status = caseItem.status;
  
  // A case is complete if it has reached step 4 (all intake steps) AND has been submitted
  const isComplete = step >= 4 && status === 'submitted';
  
  if (isComplete) {
    return {
      isComplete: true,
      label: '✓ Complete & Ready for Review',
      stepProgress: 'Submitted for Review',
      variant: 'default',
      className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-300'
    };
  }
  
  // For incomplete cases, show step progress
  const stepLabels = ['Personal Details', 'Case Description', 'Documents', 'Final Review'];
  const currentStepLabel = stepLabels[Math.min(step - 1, 3)] || 'Getting Started';
  
  return {
    isComplete: false,
    label: `⚠ In Progress (Step ${step}/4)`,
    stepProgress: `Current: ${currentStepLabel}`,
    variant: 'secondary',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300'
  };
}

export function formatCaseStatus(status: string): string {
  switch (status) {
    case 'submitted':
      return 'Under Review';
    case 'lawyer_assigned':
      return 'Awaiting Proposal';
    case 'intake':
      return 'In Progress';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'closed':
      return 'Closed';
    default:
      return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}