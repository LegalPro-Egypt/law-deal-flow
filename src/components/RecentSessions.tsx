import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Video, Phone, MessageCircle } from 'lucide-react';
import { SessionRecordingsPlayer } from '@/components/SessionRecordingsPlayer';
import { useTwilioSession } from '@/hooks/useTwilioSession';
import { useLanguage } from '@/hooks/useLanguage';

interface RecentSessionsProps {
  caseId: string;
  caseTitle: string;
}

export const RecentSessions: React.FC<RecentSessionsProps> = ({
  caseId,
  caseTitle
}) => {
  const { isRTL } = useLanguage();
  const { sessions } = useTwilioSession();
  const [showRecordings, setShowRecordings] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-4 ${isRTL() ? 'text-right' : ''}`}>
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.slice(0, 5).map((session) => (
            <div
              key={session.id}
              className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg ${isRTL() ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex items-center gap-3 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                {session.session_type === 'video' ? (
                  <Video className="w-4 h-4 text-primary" />
                ) : session.session_type === 'voice' ? (
                  <Phone className="w-4 h-4 text-primary" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-primary" />
                )}
                <div className={isRTL() ? 'text-right' : ''}>
                  <p className="text-sm font-medium capitalize">
                    {session.session_type} Session
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(session.started_at || session.created_at)}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                <Badge variant={
                  session.status === 'active' ? 'default' :
                  session.status === 'ended' ? 'secondary' :
                  session.status === 'failed' ? 'destructive' : 'outline'
                }>
                  {session.status}
                </Badge>
                {session.duration_seconds && (
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(session.duration_seconds)}
                  </span>
                )}
              </div>
            </div>
          ))}
          
          <div className="flex gap-2 pt-2">
            {sessions.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecordings(true)}
                className="flex-1"
              >
                View All Sessions ({sessions.length})
              </Button>
            )}
            
            <Dialog open={showRecordings} onOpenChange={setShowRecordings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  View Recordings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Session History - {caseTitle}</DialogTitle>
                </DialogHeader>
                <SessionRecordingsPlayer caseId={caseId} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        <div className={`text-center p-8 bg-muted/30 rounded-lg ${isRTL() ? 'text-right' : ''}`}>
          <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No communication sessions yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Start a call or chat to see session history here
          </p>
        </div>
      )}
    </div>
  );
};