import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Video, Phone, MessageCircle, Calendar, Clock, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTwilioSession, TwilioSession } from '@/hooks/useTwilioSession';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { TwilioVideoInterface } from './TwilioVideoInterface';
import { TwilioVoiceInterface } from './TwilioVoiceInterface';
import { TwilioChatInterface } from './TwilioChatInterface';
import { SessionRecordingsPlayer } from './SessionRecordingsPlayer';

interface CommunicationLauncherProps {
  caseId: string;
  caseTitle: string;
  lawyerAssigned?: boolean;
}

export const CommunicationLauncher: React.FC<CommunicationLauncherProps> = ({
  caseId,
  caseTitle,
  lawyerAssigned = false
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
    stopRecording,
    endSession
  } = useTwilioSession();

  const [communicationMode, setCommunicationMode] = useState<'video' | 'voice' | 'chat' | null>(null);
  const [showRecordings, setShowRecordings] = useState(false);
  const [waitingForLawyer, setWaitingForLawyer] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);

  const caseSessions = sessions.filter(session => session.case_id === caseId);
  const activeCaseSession = caseSessions.find(session => session.status === 'active');
  const pendingSession = caseSessions.find(session => session.status === 'scheduled');

  // Listen for session updates to know when lawyer accepts the call
  useEffect(() => {
    if (!caseId) return;

    const channel = supabase
      .channel(`case-${caseId}-sessions`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'communication_sessions',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          const updatedSession = payload.new as TwilioSession;
          
          if (updatedSession.status === 'active' && waitingForLawyer) {
            // Lawyer accepted the call, join the session
            setCommunicationMode(updatedSession.session_type);
            setWaitingForLawyer(false);
            const startTime = new Date();
            setSessionStartTime(startTime);
            sessionStartTimeRef.current = startTime;
            toast({
              title: 'Call Accepted',
              description: 'Lawyer has joined the call',
            });
          } else if (updatedSession.status === 'failed' && waitingForLawyer) {
            // Lawyer declined the call
            setWaitingForLawyer(false);
            toast({
              title: 'Call Declined',
              description: 'The lawyer declined your call request',
              variant: 'destructive',
            });
          } else if (updatedSession.status === 'ended') {
            // Session ended, cleanup local state
            setCommunicationMode(null);
            setAccessToken(null);
            setActiveSession(null);
            setWaitingForLawyer(false);
            setSessionStartTime(null);
            sessionStartTimeRef.current = null;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, waitingForLawyer, toast]);

  const handleStartCommunication = async (mode: 'video' | 'voice' | 'chat') => {
    if (!lawyerAssigned) {
      toast({
        title: 'No Lawyer Assigned',
        description: 'Please wait for a lawyer to be assigned to your case before starting communication.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setWaitingForLawyer(true);
      const token = await createAccessToken(caseId, mode);
      if (token) {
        toast({
          title: 'Call Request Sent',
          description: 'Waiting for lawyer to accept your call request...',
        });
      }
    } catch (error) {
      console.error('Error starting communication:', error);
      setWaitingForLawyer(false);
      toast({
        title: 'Connection Error',
        description: 'Failed to start communication session',
        variant: 'destructive',
      });
    }
  };

  const handleEndCommunication = async () => {
    if (activeSession) {
      await endSession(activeSession.id, sessionStartTimeRef.current || undefined);
    }
    setCommunicationMode(null);
    setAccessToken(null);
    setActiveSession(null);
    setWaitingForLawyer(false);
    setSessionStartTime(null);
    sessionStartTimeRef.current = null;
  };

  const handleCancelCall = async () => {
    if (pendingSession) {
      try {
        console.log('Cancelling call for session:', pendingSession.id);
        // Update session status to cancelled
        const { error } = await supabase
          .from('communication_sessions')
          .update({ 
            status: 'failed',
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', pendingSession.id);

        if (error) {
          console.error('Error updating session:', error);
          throw error;
        }

        console.log('Call cancelled successfully');
        toast({
          title: 'Call Cancelled',
          description: 'Your call request has been cancelled',
        });
      } catch (error) {
        console.error('Error cancelling call:', error);
        toast({
          title: 'Error',
          description: 'Failed to cancel the call',
          variant: 'destructive',
        });
      }
    }
    setWaitingForLawyer(false);
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
        ) : communicationMode === 'voice' ? (
          <TwilioVoiceInterface
            accessToken={accessToken}
            onDisconnect={handleEndCommunication}
            onRecordingToggle={handleRecordingToggle}
            recordingEnabled={activeSession?.recording_enabled || false}
          />
        ) : (
          <TwilioChatInterface
            accessToken={accessToken}
            onDisconnect={handleEndCommunication}
            onRecordingToggle={handleRecordingToggle}
            recordingEnabled={activeSession?.recording_enabled || false}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isRTL() ? 'rtl-dir' : ''}`}>
      {/* Communication Controls */}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => handleStartCommunication('video')}
                disabled={connecting || !!activeCaseSession || waitingForLawyer}
                className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}
              >
                <Video className="w-4 h-4" />
                {connecting || waitingForLawyer ? 'Waiting...' : 'Video Call'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleStartCommunication('voice')}
                disabled={connecting || !!activeCaseSession || waitingForLawyer}
                className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}
              >
                <Phone className="w-4 h-4" />
                Voice Call
              </Button>

              <Button
                variant="outline"
                onClick={() => handleStartCommunication('chat')}
                disabled={connecting || !!activeCaseSession || waitingForLawyer}
                className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}
              >
                <MessageCircle className="w-4 h-4" />
                Start Chat
              </Button>
              
              <Dialog open={showRecordings} onOpenChange={setShowRecordings}>
                <DialogTrigger asChild>
                  <Button variant="outline" className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                    <Calendar className="w-4 h-4" />
                    View History
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
          )}

          {waitingForLawyer && pendingSession && (
            <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
              <div className={`flex items-center justify-between ${isRTL() ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                  <Badge variant="outline" className="animate-pulse">
                    📞 Calling...
                  </Badge>
                  <span className="text-sm">
                    Waiting for lawyer to accept {pendingSession.session_type} call
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelCall}
                >
                  Cancel
                </Button>
              </div>
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

    </div>
  );
};