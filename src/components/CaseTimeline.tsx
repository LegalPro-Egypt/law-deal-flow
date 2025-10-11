import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, FileText, User, Calendar, CheckCircle, AlertCircle, Circle, DollarSign, MessageSquare } from 'lucide-react';
import { useCaseActivities } from '@/hooks/useCaseActivities';
import { useContracts } from '@/hooks/useContracts';
import { format } from 'date-fns';

interface CaseTimelineProps {
  caseId: string;
  caseData?: {
    created_at: string;
    updated_at: string;
    status: string;
    title: string;
    consultation_paid?: boolean;
    consultation_fee?: number;
    consultation_completed_at?: string;
  };
  userRole?: string;
}

export const CaseTimeline: React.FC<CaseTimelineProps> = ({ caseId, caseData, userRole }) => {
  const { activities, loading } = useCaseActivities(caseId);
  const { contracts } = useContracts(caseId);

  // Generate system milestones from case data
  const systemMilestones = useMemo(() => {
    if (!caseData) return [];
    
    const milestones: Array<{
      id: string;
      type: 'system';
      timestamp: Date;
      icon: JSX.Element;
      title: string;
      description: string;
      status: 'completed' | 'pending';
    }> = [];

    // Proposal accepted milestone
    if (caseData.status === 'proposal_approved' || (caseData.status === 'active' && caseData.consultation_completed_at) || caseData.status === 'work_in_progress') {
      milestones.push({
        id: 'proposal-accepted',
        type: 'system',
        timestamp: new Date(caseData.created_at),
        icon: <CheckCircle className="h-4 w-4" />,
        title: 'Proposal Accepted',
        description: 'You accepted the lawyer\'s proposal and payment terms',
        status: 'completed'
      });
    }

    // Payment completed milestone
    if (caseData.consultation_paid && (caseData as any).payment_date) {
      milestones.push({
        id: 'payment-completed',
        type: 'system',
        timestamp: new Date((caseData as any).payment_date),
        icon: <DollarSign className="h-4 w-4" />,
        title: 'Consultation Payment Completed',
        description: `Payment of $${(caseData as any).payment_amount || caseData.consultation_fee} received`,
        status: 'completed'
      });
    }

    // Awaiting consultation milestone
    if (caseData.consultation_paid && !caseData.consultation_completed_at) {
      milestones.push({
        id: 'awaiting-consultation',
        type: 'system',
        timestamp: new Date((caseData as any).payment_date || caseData.created_at),
        icon: <MessageSquare className="h-4 w-4" />,
        title: 'Awaiting Consultation',
        description: 'Your lawyer will contact you to begin the consultation',
        status: 'pending'
      });
    }

    // Consultation completed milestone
    if (caseData.consultation_completed_at) {
      milestones.push({
        id: 'consultation-completed',
        type: 'system',
        timestamp: new Date(caseData.consultation_completed_at),
        icon: <CheckCircle className="h-4 w-4" />,
        title: 'Consultation Completed',
        description: 'Initial consultation phase has been completed',
        status: 'completed'
      });
    }

    // Contract accepted milestone
    const acceptedContract = contracts?.find(c => c.client_accepted_at);
    if (acceptedContract?.client_accepted_at) {
      milestones.push({
        id: 'contract-accepted',
        type: 'system',
        timestamp: new Date(acceptedContract.client_accepted_at),
        icon: <FileText className="h-4 w-4" />,
        title: 'Contract Accepted',
        description: 'You accepted the contract. Please print, sign, and ship it to proceed.',
        status: 'completed'
      });
    }

    // Work started milestone
    if (caseData.status === 'work_in_progress') {
      milestones.push({
        id: 'work-started',
        type: 'system',
        timestamp: new Date(caseData.updated_at),
        icon: <FileText className="h-4 w-4" />,
        title: 'Case Work Started',
        description: 'Your lawyer has begun working on your case',
        status: 'completed'
      });
    }

    return milestones;
  }, [caseData, contracts]);

  // Combine and sort all timeline events
  const allEvents = useMemo(() => {
    const events = [
      ...systemMilestones,
      ...activities.map(activity => ({
        ...activity,
        type: 'activity' as const,
        timestamp: new Date(activity.created_at)
      }))
    ];
    
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [systemMilestones, activities]);

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'document_review':
        return <FileText className="h-4 w-4" />;
      case 'consultation':
        return <User className="h-4 w-4" />;
      case 'court_filing':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'in_progress':
        return 'bg-warning text-warning-foreground';
      case 'pending':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatActivityType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Case Milestones
        </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Case Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-y-auto scrollbar-thin">
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/50 via-border to-border" />
          
          <div className="space-y-1">
            {/* Case creation event */}
            {caseData && (
              <div className="relative flex items-center gap-3 py-2 group">
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background border-2 border-primary/30">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Case Created</span>
                  <span className="text-xs text-muted-foreground/60">
                    {format(new Date(caseData.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            )}

            {/* All timeline events (system + manual) */}
            {allEvents.map((event, index) => {
              const isLatest = index === allEvents.length - 1;
              if (event.type === 'system') {
                // Condensed view for past milestones
                if (!isLatest) {
                  return (
                    <div key={event.id} className="relative flex items-center gap-3 py-2 group">
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background border-2 border-success/30">
                        <div className="h-2 w-2 rounded-full bg-success" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{event.title}</span>
                        <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                          {format(event.timestamp, 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  );
                }
                
                // Expanded view for latest milestone
                return (
                  <div key={event.id} className="relative flex items-start gap-4 p-5 mt-2 bg-gradient-to-br from-success/5 to-success/10 rounded-xl border border-success/20 shadow-sm">
                    <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-success shadow-lg shadow-success/20">
                      {React.cloneElement(event.icon as React.ReactElement, { className: 'h-7 w-7 text-success-foreground' })}
                    </div>
                    <div className="flex-1 min-w-0 space-y-3 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-lg leading-tight">{event.title}</h4>
                        <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary" className="bg-success/10 text-success border-0 text-xs">
                          completed
                        </Badge>
                        <span className="text-xs text-muted-foreground/70">
                          {format(event.timestamp, 'MMM d, yyyy · h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Manual activity - condensed for past, expanded for latest
                if (!isLatest) {
                  return (
                    <div key={event.id} className="relative flex items-center gap-3 py-2 group">
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background border-2 border-primary/30">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{event.title}</span>
                        <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                          {format(event.timestamp, 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Expanded view for latest activity
                return (
                  <div key={event.id} className="relative flex items-start gap-4 p-5 mt-2 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 shadow-sm">
                    <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
                      {React.cloneElement(getActivityIcon(event.activity_type) as React.ReactElement, { className: 'h-7 w-7 text-primary-foreground' })}
                    </div>
                    <div className="flex-1 min-w-0 space-y-3 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-lg leading-tight">{event.title}</h4>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {formatActivityType(event.activity_type)}
                          </Badge>
                        </div>
                        {getStatusIcon(event.status)}
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-xs text-muted-foreground/70">
                          {format(event.timestamp, 'MMM d, yyyy · h:mm a')}
                        </span>
                        {event.hours_worked && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                            <Clock className="h-3 w-3" />
                            {event.hours_worked}h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            })}

            {allEvents.length === 0 && (
              <div className="relative flex items-center gap-3 py-8 px-4">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                  <Circle className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground/70">
                    {userRole === 'lawyer' 
                      ? "No milestones yet. Use the form above to add updates for your client."
                      : "No milestones yet. Your lawyer will add updates as they work on your case."
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};