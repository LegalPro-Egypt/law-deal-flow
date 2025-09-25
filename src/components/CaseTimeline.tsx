import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, FileText, User, Calendar, CheckCircle, AlertCircle, Circle } from 'lucide-react';
import { useCaseActivities } from '@/hooks/useCaseActivities';
import { format } from 'date-fns';

interface CaseTimelineProps {
  caseId: string;
  caseData?: {
    created_at: string;
    status: string;
    title: string;
  };
}

export const CaseTimeline: React.FC<CaseTimelineProps> = ({ caseId, caseData }) => {
  const { activities, loading } = useCaseActivities(caseId);

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
          Case Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {/* Case creation event */}
            {caseData && (
              <div className="relative flex items-start gap-4">
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Case Created</h4>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(caseData.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {caseData.title} was submitted for review
                  </p>
                </div>
              </div>
            )}

            {/* Milestone events */}
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative flex items-start gap-4">
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card border-2 border-border">
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{activity.title}</h4>
                        <Badge variant="secondary" className={getStatusColor(activity.status)}>
                          {activity.status}
                        </Badge>
                        <Badge variant="outline">
                          {formatActivityType(activity.activity_type)}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}</span>
                        {activity.hours_worked && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.hours_worked}h
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusIcon(activity.status)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {activities.length === 0 && (
              <div className="relative flex items-center gap-4 py-8">
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground">
                    No milestones yet. Your lawyer will add updates as they work on your case.
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