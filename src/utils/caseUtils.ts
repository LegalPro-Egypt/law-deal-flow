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
  const consultationPaid = caseItem.consultation_paid;
  
  // Define statuses that indicate completion beyond intake
  const advancedStatuses = [
    'lawyer_assigned', 
    'in_progress', 
    'proposal_sent', 
    'proposal_accepted', 
    'proposal_reviewed',
    'work_in_progress',
    'pending_client_confirmation',
    'consultation_completed',
    'completed', 
    'closed'
  ];
  
  // Case is complete if it has an advanced status OR if it's submitted with full intake
  const isComplete = advancedStatuses.includes(status) || (status === 'submitted' && step >= 4);
  
  if (isComplete) {
    // Provide more specific labels based on status and payment
    let label = '✓ Complete & Ready for Review';
    let stepProgress = 'Submitted for Review';
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
    let className = 'bg-green-100 text-green-800 hover:bg-green-100 border-green-300';
    
    if (status === 'lawyer_assigned') {
      label = '✓ Complete - Lawyer Assigned';
      stepProgress = 'Awaiting Proposal';
    } else if (status === 'proposal_sent') {
      label = '✓ Complete - Proposal Sent';
      stepProgress = 'Client Review Pending';
    } else if (status === 'proposal_accepted') {
      if (consultationPaid === false) {
        label = '✓ Complete - Awaiting Payment';
        stepProgress = 'Payment Required to Proceed';
        variant = 'secondary';
        className = 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300';
      } else {
        label = '✓ Complete - Proposal Accepted';
        stepProgress = 'Case in Progress';
      }
    } else if (status === 'in_progress') {
      label = '✓ Complete - Active Case';
      stepProgress = 'Work in Progress';
    } else if (status === 'consultation_completed') {
      label = '✓ Complete - Consultation Done';
      stepProgress = 'Payment Processing';
      variant = 'secondary';
      className = 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300';
    } else if (status === 'work_in_progress') {
      label = '✓ Complete - Case Work Active';
      stepProgress = 'Legal Work in Progress';
      className = 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300';
    } else if (status === 'pending_client_confirmation') {
      label = '✓ Complete - Awaiting Confirmation';
      stepProgress = 'Client Confirmation Required';
      variant = 'secondary';
      className = 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300';
    } else if (status === 'completed') {
      label = '✓ Complete - Case Closed';
      stepProgress = 'Successfully Completed';
    }
    
    return {
      isComplete: true,
      label,
      stepProgress,
      variant,
      className
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

export function formatCaseStatus(status: string, consultationPaid?: boolean, paymentStatus?: string): string {
  // Handle proposal_accepted with pending payment
  if (status === 'proposal_accepted' && consultationPaid === false) {
    return 'Awaiting Payment';
  }

  switch (status) {
    case 'submitted':
      return 'Under Review';
    case 'lawyer_assigned':
      return 'Awaiting Proposal';
    case 'proposal_sent':
      return 'Proposal Sent';
    case 'proposal_accepted':
      return 'Proposal Accepted';
    case 'consultation_completed':
      return 'Consultation Completed';
    case 'work_in_progress':
      return 'Work in Progress';
    case 'pending_client_confirmation':
      return 'Awaiting Confirmation';
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