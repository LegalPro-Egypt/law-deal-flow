import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertCircle, Target, Calendar } from "lucide-react";
import { useCaseWorkData } from "@/hooks/useCaseWorkData";
import { useAuth } from "@/hooks/useAuth";
import { formatCaseStatus } from "@/utils/caseUtils";

interface CaseWorkProgressProps {
  caseData: {
    id: string;
    case_number: string;
    status: string;
    consultation_completed_at?: string;
    grace_period_expires_at?: string;
    assigned_lawyer_id?: string;
    user_id?: string;
  };
}

export const CaseWorkProgress = ({ caseData }: CaseWorkProgressProps) => {
  const { user } = useAuth();
  const { getCaseWorkSession, markCaseComplete, getTimelineAccuracy } = useCaseWorkData();
  
  const workSession = getCaseWorkSession(caseData.id);
  const isLawyer = user?.id === caseData.assigned_lawyer_id;
  const isClient = user?.id === caseData.user_id;
  
  if (!workSession && caseData.status !== 'work_in_progress' && caseData.status !== 'pending_client_confirmation') {
    return null;
  }

  const handleComplete = async () => {
    const completionType = isLawyer ? 'lawyer_complete' : 'client_confirm';
    await markCaseComplete(caseData.id, completionType);
  };

  const getProgressPercentage = () => {
    if (!workSession) return 0;
    
    if (workSession.client_confirmed_at) return 100;
    if (workSession.lawyer_completed_at) return 75;
    return 50;
  };

  const getEstimatedDaysRemaining = () => {
    if (!workSession?.estimated_completion_date) return null;
    
    const now = new Date();
    const estimatedEnd = new Date(workSession.estimated_completion_date);
    const daysRemaining = Math.ceil((estimatedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysRemaining;
  };

  const timelineAccuracy = workSession ? getTimelineAccuracy(workSession) : null;
  const daysRemaining = getEstimatedDaysRemaining();

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          Case Work Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{getProgressPercentage()}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        {/* Status Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Current Status</div>
            <Badge variant="secondary" className="text-xs">
              {formatCaseStatus(caseData.status)}
            </Badge>
          </div>
          
          {daysRemaining !== null && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Est. Days Remaining</div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="text-sm font-medium">
                  {daysRemaining > 0 ? `${daysRemaining} days` : 'Overdue'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Work Session Details */}
        {workSession && (
          <div className="space-y-3 pt-2 border-t">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${workSession.work_started_at ? 'text-green-500' : 'text-gray-300'}`} />
                <span>Work Started: {workSession.work_started_at ? new Date(workSession.work_started_at).toLocaleDateString() : 'Pending'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${workSession.lawyer_completed_at ? 'text-green-500' : 'text-gray-300'}`} />
                <span>Lawyer Completed: {workSession.lawyer_completed_at ? new Date(workSession.lawyer_completed_at).toLocaleDateString() : 'Pending'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${workSession.client_confirmed_at ? 'text-green-500' : 'text-gray-300'}`} />
                <span>Client Confirmed: {workSession.client_confirmed_at ? new Date(workSession.client_confirmed_at).toLocaleDateString() : 'Pending'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Accuracy (if completed) */}
        {timelineAccuracy !== null && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">Timeline Accuracy</div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{Math.round(timelineAccuracy)}%</span>
              {timelineAccuracy >= 90 && <Badge variant="secondary" className="text-xs">Excellent</Badge>}
              {timelineAccuracy >= 70 && timelineAccuracy < 90 && <Badge variant="outline" className="text-xs">Good</Badge>}
              {timelineAccuracy < 70 && <Badge variant="destructive" className="text-xs">Needs Improvement</Badge>}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {caseData.status === 'work_in_progress' && isLawyer && !workSession?.lawyer_completed_at && (
          <Button 
            onClick={handleComplete}
            className="w-full"
            variant="default"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Case Complete
          </Button>
        )}

        {caseData.status === 'pending_client_confirmation' && isClient && workSession?.lawyer_completed_at && !workSession?.client_confirmed_at && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700">
                Your lawyer has marked this case as complete. Please review and confirm.
              </span>
            </div>
            <Button 
              onClick={handleComplete}
              className="w-full"
              variant="default"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Case Completion
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};