import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Video, Phone, MessageCircle, Calendar, Clock, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTwilioSession } from '@/hooks/useTwilioSession';
import { useLanguage } from '@/hooks/useLanguage';
import { TwilioVideoInterface } from './TwilioVideoInterface';
import { TwilioVoiceInterface } from './TwilioVoiceInterface';
import { SessionRecordingsPlayer } from './SessionRecordingsPlayer';

interface CommunicationLauncherProps {
  caseId: string;
  caseTitle: string;
  lawyerAssigned?: boolean;
  showProposalReview?: boolean;
}

export const CommunicationLauncher: React.FC<CommunicationLauncherProps> = ({
  caseId,
  caseTitle,
  lawyerAssigned = false,
  showProposalReview = false
}) => {
  const { isRTL } = useLanguage();
  const {
    sessions,
    activeSession,
    setActiveSession,
    accessToken,
    setAccessToken,
    connecting,
    createAccessToken,
    startRecording,
    stopRecording
  } = useTwilioSession();

  const [communicationMode, setCommunicationMode] = useState<'video' | 'voice' | null>(null);
  const [showRecordings, setShowRecordings] = useState(false);

  const caseSessions = sessions.filter(session => session.case_id === caseId);
  const activeCaseSession = caseSessions.find(session => session.status === 'active');

  const handleStartCommunication = async (mode: 'video' | 'voice') => {
    if (!lawyerAssigned) {
      toast({
        title: 'No Lawyer Assigned',
        description: 'Please wait for a lawyer to be assigned to your case before starting communication.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = await createAccessToken(caseId, mode);
      if (token) {
        setCommunicationMode(mode);
        toast({
          title: 'Starting Session',
          description: `Connecting to ${mode} session...`,
        });
      }
    } catch (error) {
      console.error('Error starting communication:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to start communication session',
        variant: 'destructive',
      });
    }
  };

  const handleEndCommunication = () => {
    setCommunicationMode(null);
    setAccessToken(null);
    setActiveSession(null);
    toast({
      title: 'Session Ended',
      description: 'Communication session has been terminated',
    });
  };

  const handleRecordingToggle = async (recording: boolean) => {
    if (!activeSession) return;

    try {
      if (recording) {
        await startRecording(activeSession.id);
      } else {
        await stopRecording(activeSession.id);
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
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

  // If currently in a communication session, show the interface
  if (communicationMode && accessToken) {
    return (
      <div className="space-y-4">
        {communicationMode === 'video' ? (
          <TwilioVideoInterface
            accessToken={accessToken}
            onDisconnect={handleEndCommunication}
            onRecordingToggle={handleRecordingToggle}
            recordingEnabled={activeSession?.recording_enabled || false}
          />
        ) : (
          <TwilioVoiceInterface
            accessToken={accessToken}
            onDisconnect={handleEndCommunication}
            onRecordingToggle={handleRecordingToggle}
            recordingEnabled={activeSession?.recording_enabled || false}
          />
        )}
      </div>
    );
  }

  // If showing proposal review, return just the review button
  if (showProposalReview) {
  // If showing proposal review, return just the review button
  if (showProposalReview) {
    return (
      <div className={`${isRTL() ? 'text-right' : ''}`}>
        <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => {}}>
          Review Proposal
        </Button>
      </div>
    );
  }

  return (
      <div className={`${isRTL() ? 'text-right' : ''}`}>
        <Button className="w-full bg-primary hover:bg-primary/90">
          Review Proposal
        </Button>
      </div>
    );
  }
  return (
    <div className={`space-y-4 ${isRTL() ? 'rtl-dir' : ''}`}>
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse justify-end' : ''}`}>
            <Video className="w-5 h-5" />
            Communication
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-4 ${isRTL() ? 'text-right' : ''}`}>
          {!lawyerAssigned ? (
            <div className={`text-center p-4 bg-muted rounded-lg ${isRTL() ? 'text-right' : ''}`}>
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Waiting for lawyer assignment to enable communication
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => handleStartCommunication('video')}
                disabled={connecting || !!activeCaseSession}
                className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}
              >
                <Video className="w-4 h-4" />
                {connecting ? 'Connecting...' : 'Start Video Call'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleStartCommunication('voice')}
                disabled={connecting || !!activeCaseSession}
                className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}
              >
                <Phone className="w-4 h-4" />
                Voice Call
              </Button>
              
              <Dialog open={showRecordings} onOpenChange={setShowRecordings}>
                <DialogTrigger asChild>
                  <Button variant="outline" className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                    <MessageCircle className="w-4 h-4" />
                    View Recordings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Session Recordings - {caseTitle}</DialogTitle>
                  </DialogHeader>
                  <SessionRecordingsPlayer caseId={caseId} />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeCaseSession && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className={`flex items-center justify-between ${isRTL() ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                  <Badge variant="default" className="animate-pulse">
                    🔴 Active Session
                  </Badge>
                  <span className="text-sm">
                    {activeCaseSession.session_type} call in progress
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Started {formatDate(activeCaseSession.started_at || activeCaseSession.created_at)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {caseSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse justify-end' : ''}`}>
              <Clock className="w-5 h-5" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className={isRTL() ? 'text-right' : ''}>
            <div className="space-y-3">
              {caseSessions.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg ${isRTL() ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex items-center gap-3 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                    {session.session_type === 'video' ? (
                      <Video className="w-4 h-4 text-primary" />
                    ) : (
                      <Phone className="w-4 h-4 text-primary" />
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
              
              {caseSessions.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRecordings(true)}
                  className="w-full"
                >
                  View All Sessions ({caseSessions.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};