import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ToastAction } from '@/components/ui/toast';
import { Video, Phone, MessageCircle, Calendar, Clock, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTwilioSession, TwilioSession } from '@/hooks/useTwilioSession';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { setupBrowserSessionCleanup, createSessionValidator } from '@/utils/sessionCleanup';
import { TwilioVideoInterface } from './TwilioVideoInterface';
import { TwilioVoiceInterface } from './TwilioVoiceInterface';
import { TwilioChatInterface } from './TwilioChatInterface';
import { DirectChatInterface } from './DirectChatInterface';
import { SessionRecordingsPlayer } from './SessionRecordingsPlayer';
import { NotificationBadge } from './ui/notification-badge';
import { useChatNotifications } from '@/hooks/useChatNotifications';

interface CommunicationLauncherProps {
  caseId: string;
  caseTitle: string;
  lawyerAssigned?: boolean;
  communicationModes?: {
    text: boolean;
    voice: boolean;
    video: boolean;
  };
}

export const CommunicationLauncher: React.FC<CommunicationLauncherProps> = ({
  caseId,
  caseTitle,
  lawyerAssigned = false,
  communicationModes = { text: true, voice: true, video: true }
}) => {
  // Force cache refresh - component updated at 2025-01-20
  console.log('🚀 CommunicationLauncher rendering with caseId:', caseId);
  const { isRTL } = useLanguage();
  const { unreadCounts } = useChatNotifications();
  const {
    sessions,
    activeSession,
    setActiveSession,
    accessToken,
    setAccessToken,
    connecting,
    createAccessToken,
    endSession
  } = useTwilioSession();

  const { user } = useAuth();

  const [communicationMode, setCommunicationMode] = useState<'video' | 'voice' | 'chat' | null>(null);
  const [showRecordings, setShowRecordings] = useState(false);
  const [showDirectChat, setShowDirectChat] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  console.log('✅ waitingForResponse state initialized:', waitingForResponse);
  const [waitingMode, setWaitingMode] = useState<'video' | 'voice' | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const browserCleanupRef = useRef<(() => void) | null>(null);
  const sessionValidatorRef = useRef<(() => void) | null>(null);

  const [isCurrentUserClient, setIsCurrentUserClient] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id || !caseId) return;
    const fetchRole = async () => {
      try {
        const { data } = await supabase
          .from('cases')
          .select('user_id, assigned_lawyer_id')
          .eq('id', caseId)
          .single();
        if (data) {
          setIsCurrentUserClient(data.user_id === user.id);
        }
      } catch {}
    };
    fetchRole();
  }, [user?.id, caseId]);

  // Persist chat modal open state to survive parent remounts (e.g., after file uploads)
  const storageKey = `directChatOpen:${caseId}`;
  useEffect(() => {
    const wasOpen = sessionStorage.getItem(storageKey) === '1';
    if (wasOpen) {
      console.log('CommunicationLauncher: Restoring direct chat open state from sessionStorage');
      setShowDirectChat(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (showDirectChat) {
      sessionStorage.setItem(storageKey, '1');
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }, [showDirectChat, storageKey]);

  const caseSessions = sessions.filter(session => session.case_id === caseId);
  // Only consider a session truly active if it has started_at (participants joined)
  const activeCaseSession = caseSessions.find(session => 
    session.status === 'active' && session.started_at
  );
  const pendingSession = pendingSessionId
    ? sessions.find(session => session.id === pendingSessionId && session.status === 'scheduled') ||
      caseSessions.find(session => session.status === 'scheduled' && session.id === pendingSessionId)
    : caseSessions.find(session => session.status === 'scheduled' && (
        (!waitingMode || session.session_type === waitingMode) &&
        (!user?.id || session.initiated_by === user.id)
      )) || null;

  console.log('🔍 Debug - State check:', {
    waitingForResponse,
    waitingMode,
    pendingSessionId,
    pendingSession: pendingSession?.id,
    sessionsCount: sessions.length,
    caseSessionsCount: caseSessions.length
  });

  // Setup browser cleanup and session validation when session becomes active
  useEffect(() => {
    if (activeSession && activeSession.status === 'active') {
      console.log('Setting up session monitoring for:', activeSession.id);
      
      // Setup browser cleanup for when user closes tab/browser
      browserCleanupRef.current = setupBrowserSessionCleanup(activeSession.id);
      
      // Setup session validator
      sessionValidatorRef.current = createSessionValidator(activeSession.id, () => {
        console.log('Session validator detected session ended, cleaning up UI...');
        handleEndCommunication();
      });
    }
    
    return () => {
      // Cleanup when session changes or component unmounts
      if (browserCleanupRef.current) {
        browserCleanupRef.current();
        browserCleanupRef.current = null;
      }
      if (sessionValidatorRef.current) {
        sessionValidatorRef.current();
        sessionValidatorRef.current = null;
      }
    };
  }, [activeSession]);

  // Listen for session updates to handle call acceptance and incoming calls
  useEffect(() => {
    if (!caseId || !user?.id) return;

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
          console.log('🔥 Session update received:', {
            sessionId: updatedSession.id,
            status: updatedSession.status,
            sessionType: updatedSession.session_type,
            startedAt: updatedSession.started_at,
            initiatedBy: updatedSession.initiated_by,
            currentUser: user.id,
            waitingForResponse,
            waitingMode,
            pendingSessionId
          });
          
          // Only process 'active' sessions with a started_at timestamp
          if (updatedSession.status === 'active' && updatedSession.started_at) {
            const isInitiator = updatedSession.initiated_by === user.id;
            
            if (isInitiator && waitingForResponse) {
              // We initiated the call and it was accepted - connect to Twilio
              console.log('🚀 Our call was accepted, connecting to Twilio...');
              
              createAccessToken(caseId, updatedSession.session_type, updatedSession.id)
                .then(token => {
                  if (token) {
                    console.log('✅ Got access token, joining room:', token.sessionId);
                    setAccessToken(token);
                    setCommunicationMode(updatedSession.session_type);
                    setWaitingForResponse(false);
                    setWaitingMode(null);
                    setPendingSessionId(null);
                    const startTime = new Date();
                    setSessionStartTime(startTime);
                    sessionStartTimeRef.current = startTime;
                    toast({
                      title: 'Call Accepted',
                      description: 'The other party has joined the call',
                    });
                  } else {
                    console.error('❌ Failed to get access token');
                    toast({
                      title: 'Connection Error',
                      description: 'Failed to join the call',
                      variant: 'destructive',
                    });
                    setWaitingForResponse(false);
                    setWaitingMode(null);
                    setPendingSessionId(null);
                  }
                })
                .catch(error => {
                  console.error('❌ Error getting access token:', error);
                  toast({
                    title: 'Connection Error',
                    description: 'Failed to join the call',
                    variant: 'destructive',
                  });
                  setWaitingForResponse(false);
                  setWaitingMode(null);
                  setPendingSessionId(null);
                });
            } else if (!isInitiator && !waitingForResponse) {
              // Incoming call - someone else initiated and we're not already waiting
              console.log('📞 Incoming call detected');
              
              const modeLabel = updatedSession.session_type === 'video' ? 'Video' : 'Voice';
              const initiatorRole = isCurrentUserClient === false ? 'Client' : 'Lawyer';
              
              // Handle the incoming call join action
              const handleJoinCall = async () => {
                console.log('🎯 Accepting incoming call and updating session to active...');
                try {
                  // First, update the session status to 'active' with started_at
                  // This will trigger the UPDATE event for both parties
                  const { error: updateError } = await supabase
                    .from('communication_sessions')
                    .update({
                      status: 'active',
                      started_at: new Date().toISOString()
                    })
                    .eq('id', updatedSession.id);
                  
                  if (updateError) {
                    console.error('❌ Error updating session to active:', updateError);
                    toast({
                      title: 'Connection Error',
                      description: 'Failed to accept the call',
                      variant: 'destructive',
                    });
                    return;
                  }
                  
                  console.log('✅ Session updated to active, waiting for token...');
                  // The session UPDATE event will trigger token creation and connection for both parties
                } catch (error) {
                  console.error('❌ Error accepting call:', error);
                  toast({
                    title: 'Connection Error',
                    description: 'Failed to accept the call',
                    variant: 'destructive',
                  });
                }
              };
              
              toast({
                title: `Incoming ${modeLabel} Call`,
                description: `${initiatorRole} is calling you`,
                action: (
                  <ToastAction altText="Join call" onClick={handleJoinCall}>
                    Join
                  </ToastAction>
                ),
                duration: 30000, // 30 seconds to accept
              });
            }
          } else if (updatedSession.status === 'failed' && waitingForResponse) {
            // Call failed or was declined
            setWaitingForResponse(false);
            setWaitingMode(null);
            setPendingSessionId(null);
            toast({
              title: 'Call Failed',
              description: 'The call could not be completed or was declined',
              variant: 'destructive',
            });
          } else if (updatedSession.status === 'ended') {
            // Session ended, cleanup local state
            setCommunicationMode(null);
            setAccessToken(null);
            setActiveSession(null);
            setWaitingForResponse(false);
            setWaitingMode(null);
            setPendingSessionId(null);
            setSessionStartTime(null);
            sessionStartTimeRef.current = null;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, user?.id, waitingForResponse, isCurrentUserClient, toast, createAccessToken]);

  const handleStartCommunication = async (mode: 'video' | 'voice' | 'chat') => {
    console.log('📞 Starting communication with mode:', mode);
    
    if (!lawyerAssigned) {
      toast({
        title: 'No Lawyer Assigned',
        description: 'Please wait for a lawyer to be assigned to your case before starting communication.',
        variant: 'destructive',
      });
      return;
    }

    // Handle chat differently - open directly without session
    if (mode === 'chat') {
      setShowDirectChat(true);
      return;
    }

    // For video and voice, create session but DON'T connect until status is 'active'
    try {
      console.log('🚀 handleStartCommunication - Creating session for:', mode);
      const token = await createAccessToken(caseId, mode);
      console.log('🚀 handleStartCommunication - Got token:', token?.sessionId);
      
      if (token) {
        // DO NOT set accessToken or communicationMode yet - only set waiting state
        // The initiator will connect when the session becomes 'active'
        setPendingSessionId(token.sessionId);
        setWaitingForResponse(true);
        setWaitingMode(mode);
        
        const modeLabel = mode === 'video' ? 'video' : 'voice';
        const desc = isCurrentUserClient === false
          ? `Calling client for a ${modeLabel} call...`
          : (isCurrentUserClient === true
              ? `Waiting for lawyer to accept your ${modeLabel} call...`
              : `Starting a ${modeLabel} call...`);
        toast({
          title: 'Call Request Sent',
          description: desc,
        });
      }
    } catch (error) {
      console.error('Error starting communication:', error);
      setWaitingForResponse(false);
      setWaitingMode(null);
      setPendingSessionId(null);
      toast({
        title: 'Connection Error',
        description: 'Failed to start communication session',
        variant: 'destructive',
      });
    }
  };

  const handleEndCommunication = async () => {
    try {
      if (activeSession) {
        console.log('Ending communication session:', activeSession.id);
        const success = await endSession(activeSession.id, sessionStartTimeRef.current || undefined);
        
        if (!success) {
          // If normal end session fails, try emergency cleanup
          console.log('Normal session end failed, attempting emergency cleanup...');
          await supabase.functions.invoke('session-cleanup', {
            body: { sessionId: activeSession.id }
          });
        }
      }
      
      // Clean up local state regardless of server response
      setCommunicationMode(null);
      setAccessToken(null);
      setActiveSession(null);
      setWaitingForResponse(false);
      setWaitingMode(null);
      setPendingSessionId(null);
      setSessionStartTime(null);
      sessionStartTimeRef.current = null;
      
      // Clean up session monitoring
      if (browserCleanupRef.current) {
        browserCleanupRef.current();
        browserCleanupRef.current = null;
      }
      if (sessionValidatorRef.current) {
        sessionValidatorRef.current();
        sessionValidatorRef.current = null;
      }
      
      toast({
        title: 'Session Ended',
        description: 'Communication session has been ended successfully',
      });
    } catch (error) {
      console.error('Error ending communication:', error);
      
      // Still clean up local state and monitoring even if there's an error
      setCommunicationMode(null);
      setAccessToken(null);
      setActiveSession(null);
      setWaitingForResponse(false);
      setWaitingMode(null);
      setPendingSessionId(null);
      setSessionStartTime(null);
      sessionStartTimeRef.current = null;
      
      // Clean up session monitoring
      if (browserCleanupRef.current) {
        browserCleanupRef.current();
        browserCleanupRef.current = null;
      }
      if (sessionValidatorRef.current) {
        sessionValidatorRef.current();
        sessionValidatorRef.current = null;
      }
      
      toast({
        title: 'Session Ended',
        description: 'Session ended with cleanup warnings',
        variant: 'destructive',
      });
    }
  };

  const handleCancelCall = async () => {
    console.log('🔴 handleCancelCall - Current state:', {
      pendingSession: pendingSession?.id,
      waitingForResponse,
      waitingMode,
      pendingSessionId
    });

    const idToCancel = pendingSession?.id || pendingSessionId;

    if (idToCancel) {
      try {
        console.log('Cancelling call for session:', idToCancel);
        // Update session status to cancelled
        const { error } = await supabase
          .from('communication_sessions')
          .update({ 
            status: 'failed',
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', idToCancel);

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
    } else {
      console.log('No session id available yet; cancelling local waiting state only.');
    }
    setWaitingForResponse(false);
    setWaitingMode(null);
    setPendingSessionId(null);
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

  // Show direct chat interface if open
  const directChatModal = showDirectChat && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl">
        <DirectChatInterface
          caseId={caseId}
          caseTitle={caseTitle}
          onClose={() => {
            console.log('CommunicationLauncher: DirectChat onClose called');
            setShowDirectChat(false);
          }}
        />
      </div>
    </div>
  );

  // If currently in a communication session, show the interface
  if (communicationMode && accessToken) {
    console.log('🔍 CommunicationLauncher - Rendering interface for mode:', communicationMode);
    console.log('🔍 CommunicationLauncher - Access token:', accessToken);
    return (
      <div className="space-y-4">
        {communicationMode === 'video' ? (
          <>
            {console.log('🎥 Rendering TwilioVideoInterface')}
            <TwilioVideoInterface
              accessToken={accessToken}
              onDisconnect={handleEndCommunication}
            />
          </>
        ) : communicationMode === 'voice' ? (
          <>
            {console.log('🎤 Rendering TwilioVoiceInterface')}
            <TwilioVoiceInterface
              accessToken={accessToken}
              onDisconnect={handleEndCommunication}
            />
          </>
        ) : communicationMode === 'chat' ? (
          <>
            {console.log('💬 Rendering TwilioChatInterface')}
            <TwilioChatInterface
              accessToken={accessToken}
              onDisconnect={handleEndCommunication}
            />
          </>
        ) : (
          <div>Unknown communication mode: {communicationMode}</div>
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
                disabled={!communicationModes.video || connecting || !!activeCaseSession || waitingForResponse}
                className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''} ${!communicationModes.video ? 'opacity-50' : ''}`}
                title={!communicationModes.video ? 'Video calls are currently disabled' : ''}
              >
                <Video className="w-4 h-4" />
                {waitingMode === 'video' ? 'Waiting...' : 'Video Call'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleStartCommunication('voice')}
                disabled={!communicationModes.voice || connecting || !!activeCaseSession || waitingForResponse}
                className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''} ${!communicationModes.voice ? 'opacity-50' : ''}`}
                title={!communicationModes.voice ? 'Voice calls are currently disabled' : ''}
              >
                <Phone className="w-4 h-4" />
                {waitingMode === 'voice' ? 'Waiting...' : 'Voice Call'}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleStartCommunication('chat')}
                disabled={!communicationModes.text}
                className={`flex items-center gap-2 relative ${isRTL() ? 'flex-row-reverse' : ''} ${!communicationModes.text ? 'opacity-50' : ''}`}
                title={!communicationModes.text ? 'Text chat is currently disabled' : ''}
              >
                <MessageCircle className="w-4 h-4" />
                Start Chat
                {unreadCounts[caseId] && unreadCounts[caseId] > 0 && (
                  <NotificationBadge count={unreadCounts[caseId]} />
                )}
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

          {waitingForResponse && (
            <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
              <div className={`${isRTL() ? 'flex-row-reverse' : ''} flex items-center justify-between`}>
                <div className={`${isRTL() ? 'flex-row-reverse' : ''} flex items-center gap-2`}>
                  <Badge variant="outline" className="animate-pulse">
                    📞 Calling...
                  </Badge>
                  <span className="text-sm">
                    {(() => {
                      const type = waitingMode || 'voice';
                      const label = type === 'video' ? 'video' : 'voice';
                      if (isCurrentUserClient === true) {
                        return `Waiting for lawyer to accept a ${label} call...`;
                      }
                      if (isCurrentUserClient === false) {
                        return `Calling client for a ${label} call...`;
                      }
                      return `Starting a ${label} call...`;
                    })()}
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
      
      {/* Direct Chat Modal */}
      {directChatModal}
    </div>
  );
};