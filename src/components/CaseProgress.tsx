import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Circle,
  FileCheck2,
  Wallet,
  UserRound,
  MessageSquare,
  FileText,
  Gavel,
  Target,
  Loader2,
  AlertCircle,
  ClipboardList,
  Calendar,
} from 'lucide-react';
import { useCaseWorkData } from '@/hooks/useCaseWorkData';
import { useCaseActivities } from '@/hooks/useCaseActivities';
import { useContracts } from '@/hooks/useContracts';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCaseStatus } from '@/utils/caseUtils';

interface CaseProgressProps {
  caseData: {
    id: string;
    case_number: string;
    status: string;
    title?: string;
    created_at: string;
    updated_at: string;
    assigned_lawyer_id?: string;
    user_id?: string;
    consultation_paid?: boolean;
    consultation_fee?: number;
    consultation_completed_at?: string;
    grace_period_expires_at?: string;
    payment_date?: string;
    payment_amount?: number;
  };
  userRole?: 'lawyer' | 'client' | 'admin';
}

const iconProps = {
  size: 18,
  strokeWidth: 2,
};

export const CaseProgress: React.FC<CaseProgressProps> = ({ caseData, userRole }) => {
  const { user } = useAuth();
  const { getCaseWorkSession, markCaseComplete, getTimelineAccuracy } = useCaseWorkData();
  const { activities, loading: activitiesLoading } = useCaseActivities(caseData.id);
  const { contracts } = useContracts(caseData.id);

  const workSession = getCaseWorkSession(caseData.id);
  const isLawyer = user?.id === caseData.assigned_lawyer_id;
  const isClient = user?.id === caseData.user_id;

  // Status configuration
  const getStatusConfig = () => {
    if (workSession?.client_confirmed_at) {
      return {
        label: 'Completed',
        color: 'bg-green-500/10 text-green-600 border-green-500/20',
        dot: 'bg-green-500',
        icon: <CheckCircle2 size={14} strokeWidth={2} />,
      };
    }

    if (caseData.status === 'work_in_progress' || workSession?.work_started_at) {
      return {
        label: 'Active',
        color: 'bg-green-500/10 text-green-600 border-green-500/20',
        dot: 'bg-green-500',
        icon: <Loader2 size={14} strokeWidth={2} className="animate-spin" />,
      };
    }

    if (caseData.status === 'pending_client_confirmation' || caseData.status === 'proposal_approved') {
      return {
        label: 'In Progress',
        color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        dot: 'bg-blue-500',
        icon: <Clock size={14} strokeWidth={2} />,
      };
    }

    return {
      label: 'Pending',
      color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
      dot: 'bg-gray-500',
      icon: <Circle size={14} strokeWidth={2} />,
    };
  };

  const statusConfig = getStatusConfig();

  // Generate system milestones
  const systemMilestones = useMemo(() => {
    const milestones: Array<{
      id: string;
      type: 'system';
      timestamp: Date;
      title: string;
      description: string;
      status: 'completed' | 'pending';
      iconType: string;
    }> = [];

    if (caseData.status === 'proposal_approved' || caseData.status === 'active' || caseData.status === 'work_in_progress') {
      milestones.push({
        id: 'proposal-accepted',
        type: 'system',
        timestamp: new Date(caseData.created_at),
        title: 'Proposal Accepted',
        description: 'You accepted the lawyer\'s proposal and payment terms',
        status: 'completed',
        iconType: 'check',
      });
    }

    if (caseData.consultation_paid && caseData.payment_date) {
      milestones.push({
        id: 'payment-completed',
        type: 'system',
        timestamp: new Date(caseData.payment_date),
        title: 'Consultation Payment Completed',
        description: `Payment of $${caseData.payment_amount || caseData.consultation_fee} received`,
        status: 'completed',
        iconType: 'payment',
      });
    }

    if (caseData.consultation_paid && !caseData.consultation_completed_at) {
      milestones.push({
        id: 'awaiting-consultation',
        type: 'system',
        timestamp: new Date(caseData.payment_date || caseData.created_at),
        title: 'Awaiting Consultation',
        description: 'Your lawyer will contact you to begin the consultation',
        status: 'pending',
        iconType: 'message',
      });
    }

    if (caseData.consultation_completed_at) {
      milestones.push({
        id: 'consultation-completed',
        type: 'system',
        timestamp: new Date(caseData.consultation_completed_at),
        title: 'Consultation Completed',
        description: 'Initial consultation phase has been completed',
        status: 'completed',
        iconType: 'user',
      });
    }

    const acceptedContract = contracts?.find(c => c.client_accepted_at);
    if (acceptedContract?.client_accepted_at) {
      milestones.push({
        id: 'contract-accepted',
        type: 'system',
        timestamp: new Date(acceptedContract.client_accepted_at),
        title: 'Contract Accepted',
        description: 'You accepted the contract. Please print, sign, and ship it to proceed.',
        status: 'completed',
        iconType: 'contract',
      });
    }

    if (caseData.status === 'work_in_progress') {
      milestones.push({
        id: 'work-started',
        type: 'system',
        timestamp: new Date(caseData.updated_at),
        title: 'Case Work Started',
        description: 'Your lawyer has begun working on your case',
        status: 'completed',
        iconType: 'file',
      });
    }

    return milestones;
  }, [caseData, contracts]);

  // Combine and sort all events
  const allEvents = useMemo(() => {
    const events = [
      ...systemMilestones,
      ...activities.map(activity => ({
        ...activity,
        type: 'activity' as const,
        timestamp: new Date(activity.created_at),
      })),
    ];

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [systemMilestones, activities]);

  // Get milestone icon
  const getMilestoneIcon = (milestone: any) => {
    if (milestone.type === 'system') {
      switch (milestone.iconType) {
        case 'payment':
          return <Wallet {...iconProps} className="text-green-600 dark:text-green-400" />;
        case 'contract':
          return <FileCheck2 {...iconProps} className="text-green-600 dark:text-green-400" />;
        case 'user':
          return <UserRound {...iconProps} className="text-green-600 dark:text-green-400" />;
        case 'message':
          return <MessageSquare {...iconProps} className="text-gray-400" />;
        case 'file':
          return <FileText {...iconProps} className="text-green-600 dark:text-green-400" />;
        default:
          return <CheckCircle2 {...iconProps} className="text-green-600 dark:text-green-400" />;
      }
    } else {
      switch (milestone.activity_type) {
        case 'document_review':
          return <FileText {...iconProps} className="text-primary" />;
        case 'consultation':
          return <UserRound {...iconProps} className="text-primary" />;
        case 'court_filing':
          return <Gavel {...iconProps} className="text-primary" />;
        default:
          return <Target {...iconProps} className="text-primary" />;
      }
    }
  };

  // Progress percentage
  const getProgressPercentage = () => {
    if (!workSession) return 0;
    if (workSession.client_confirmed_at) return 100;
    if (workSession.lawyer_completed_at) return 75;
    return 50;
  };

  // Timeline accuracy
  const timelineAccuracy = workSession ? getTimelineAccuracy(workSession) : null;

  // Handle completion
  const handleComplete = async () => {
    const completionType = isLawyer ? 'lawyer_complete' : 'client_confirm';
    await markCaseComplete(caseData.id, completionType);
  };

  // Loading state
  if (activitiesLoading) {
    return (
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-semibold">Case Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm border-border/50 bg-white dark:bg-gray-900">
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100">
              Case Progress
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={cn(statusConfig.color, 'mt-2 border font-medium text-xs px-3 py-1 cursor-help')}
                  role="status"
                  aria-live="polite"
                >
                  <div className={cn(statusConfig.dot, 'h-2 w-2 rounded-full mr-2 shrink-0')} />
                  <span className="truncate">
                    {statusConfig.label} — since {format(new Date(caseData.created_at), 'MMM d, yyyy')}
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {statusConfig.label === 'Completed'
                    ? `Completed on ${format(new Date(workSession?.client_confirmed_at || caseData.updated_at), 'PPP')}`
                    : `${statusConfig.label} since ${format(new Date(caseData.created_at), 'PPP')}`}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
        {/* Progress Bar - Only show for work in progress */}
        {workSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2 pb-4 border-b border-border/40"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
              <span className="text-sm text-muted-foreground tabular-nums">{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative pl-4 sm:pl-6 max-h-[60vh] sm:max-h-[500px] overflow-y-auto space-y-2"
        >
          {/* Timeline line with inner shadow */}
          <div className="absolute left-[9px] sm:left-[11px] top-2 bottom-2 w-[1.5px] sm:w-[2px] bg-gradient-to-b from-primary/50 via-border to-border">
            <div className="absolute inset-0 w-[1.5px] sm:w-[2px] bg-gradient-to-b from-transparent via-black/5 dark:via-white/5 to-transparent blur-[1px]" />
          </div>

          <div className="space-y-1">
            {/* Case Created */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="relative flex items-center gap-3 py-2 px-2 -ml-2 rounded-lg transition-all duration-200 hover:bg-muted/30"
            >
              <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background border-2 border-primary/30">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate text-muted-foreground">Case Created</span>
                <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                  {format(new Date(caseData.created_at), 'MMM d')}
                </span>
              </div>
            </motion.div>

            {/* Section Divider - Automated Events */}
            {systemMilestones.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="relative flex items-center gap-3 py-2"
              >
                <div className="flex-1 h-px bg-border/40 dark:bg-border/30" />
                <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                  Automated Events
                </span>
                <div className="flex-1 h-px bg-border/40 dark:bg-border/30" />
              </motion.div>
            )}

            {/* All Events */}
            {allEvents.map((event, index) => {
              const isLatest = index === allEvents.length - 1;
              const isActivity = event.type === 'activity';

              // Section divider before first activity
              if (isActivity && (index === 0 || allEvents[index - 1].type === 'system')) {
                return (
                  <React.Fragment key={event.id}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="relative flex items-center gap-3 py-2 mt-2"
                    >
                      <div className="flex-1 h-px bg-border/40 dark:bg-border/30" />
                      <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                        Activity Log
                      </span>
                      <div className="flex-1 h-px bg-border/40 dark:bg-border/30" />
                    </motion.div>
                    {renderEvent(event, isLatest, index)}
                  </React.Fragment>
                );
              }

              return renderEvent(event, isLatest, index);
            })}

            {/* Empty State */}
            {allEvents.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative flex flex-col items-center justify-center py-12 px-6 text-center bg-muted/20 rounded-xl border border-dashed border-border/50"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h4 className="font-semibold text-base mb-2 text-gray-900 dark:text-gray-100">
                  No milestones yet
                </h4>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  {userRole === 'lawyer'
                    ? "Use the form above to add updates for your client. They'll see your progress here."
                    : "Your case progress will appear here once your lawyer begins work. You'll be notified of updates."}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Timeline Accuracy Meter */}
        {workSession && timelineAccuracy !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="flex items-center justify-between gap-3 p-4 mt-4 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/30"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <Target size={16} strokeWidth={2} className="text-primary" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Timeline Accuracy
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs leading-relaxed">
                  Measures how closely the actual completion date matched the estimated timeline.
                  {timelineAccuracy >= 90 && ' Excellent accuracy!'}
                  {timelineAccuracy < 70 && ' The case took longer than initially estimated.'}
                </p>
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-3">
              <div className="h-2 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${timelineAccuracy}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full',
                    timelineAccuracy >= 90
                      ? 'bg-green-500'
                      : timelineAccuracy >= 70
                      ? 'bg-blue-500'
                      : 'bg-yellow-500'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  timelineAccuracy >= 90
                    ? 'text-green-600 dark:text-green-400'
                    : timelineAccuracy >= 70
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                )}
              >
                {timelineAccuracy}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        {isLawyer &&
          caseData.status === 'work_in_progress' &&
          workSession &&
          !workSession.lawyer_completed_at && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Button
                onClick={handleComplete}
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark Case Complete
              </Button>
            </motion.div>
          )}

        {isClient &&
          workSession?.lawyer_completed_at &&
          !workSession.client_confirmed_at && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Your lawyer has marked this case as complete
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Please review the work and confirm completion below.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleComplete}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm Completion
              </Button>
            </motion.div>
          )}
      </CardContent>
    </Card>
  );

  // Helper function to render events
  function renderEvent(event: any, isLatest: boolean, index: number) {
    const isActivity = event.type === 'activity';

    // Condensed view for past items
    if (!isLatest) {
      return (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
          whileHover={{
            backgroundColor: 'hsl(var(--muted) / 0.3)',
            transition: { duration: 0.15 },
          }}
          className="relative flex items-center gap-3 py-2 px-2 -ml-2 rounded-lg transition-colors cursor-pointer"
        >
          <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background border-2 border-green-500/30">
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate text-muted-foreground">{event.title}</span>
            <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
              {format(event.timestamp, 'MMM d')}
            </span>
          </div>
        </motion.div>
      );
    }

    // Expanded view for latest milestone
    const bgGradient = isActivity
      ? 'from-primary/5 to-primary/10 dark:from-primary/20 dark:to-primary/10'
      : 'from-green-50 to-green-50/50 dark:from-green-900/20 dark:to-green-900/10';
    const borderColor = isActivity
      ? 'border-primary/20 dark:border-primary/30'
      : 'border-green-200/50 dark:border-green-800/50';
    const iconBg = isActivity ? 'bg-primary' : 'bg-success';
    const iconShadow = isActivity ? 'shadow-primary/20' : 'shadow-success/20';

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(
          'relative flex items-start gap-4 p-5 mt-2 rounded-xl border shadow-sm',
          'hover:shadow-md transition-all duration-200',
          'bg-gradient-to-br',
          bgGradient,
          borderColor
        )}
      >
        <div className={cn('relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-lg', iconBg, iconShadow)}>
          {React.cloneElement(getMilestoneIcon(event), {
            className: cn('h-7 w-7', isActivity ? 'text-primary-foreground' : 'text-success-foreground'),
          })}
        </div>
        <div className="flex-1 min-w-0 space-y-3 pt-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base sm:text-lg leading-tight text-gray-900 dark:text-gray-100 truncate sm:whitespace-normal">
                {event.title}
              </h4>
              {isActivity && event.activity_type && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {event.activity_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Badge>
              )}
            </div>
            <CheckCircle2
              className={cn('h-5 w-5 shrink-0 mt-0.5', isActivity ? 'text-primary' : 'text-success')}
            />
          </div>
          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">
              {event.description}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <Badge
              variant="secondary"
              className={cn(
                'text-xs border-0',
                isActivity ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
              )}
            >
              {event.status || 'completed'}
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-500">
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
      </motion.div>
    );
  }
};
