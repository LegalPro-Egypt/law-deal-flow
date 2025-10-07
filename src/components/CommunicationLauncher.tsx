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
  const activeCaseSession = caseSessions.find(session => session.status === 'active');

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

  // Listen for incoming calls (INSERT events for active sessions)
  useEffect(() => {
    if (!caseId || !user?.id) return;

    const channel = supabase
      .channel(`case-${caseId}-sessions`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_sessions',
          filter: `case_id=eq.${caseId}`
        },
        async (payload) => {
          const newSession = payload.new as TwilioSession;
          console.log('📞 New session detected:', newSession);
          
          // Check if this is an incoming call (not initiated by us)
          if (newSession.initiated_by !== user.id && newSession.status === 'active') {
            console.log('📲 Incoming call from another user');
            
            const modeLabel = newSession.session_type === 'video' ? 'Video' : 'Voice';
            const initiatorRole = isCurrentUserClient === false ? 'Client' : 'Lawyer';
            
            const handleJoinCall = async () => {
              console.log('🎯 Joining incoming call...');
              try {
                const token = await createAccessToken(caseId, newSession.session_type, newSession.id);
                if (token) {
                  setAccessToken(token);
                  setCommunicationMode(newSession.session_type);
                  const startTime = new Date();
                  setSessionStartTime(startTime);
                  sessionStartTimeRef.current = startTime;
                  toast({
                    title: 'Joined Call',
                    description: 'Connected to the call',
                  });
                }
              } catch (error) {
                console.error('❌ Error joining call:', error);
                toast({
                  title: 'Connection Error',
                  description: 'Failed to join the call',
                  variant: 'destructive',
                });
              }
            };
            
            const handleDeclineCall = async () => {
              console.log('🔴 Declining incoming call...');
              try {
                await supabase
                  .from('communication_sessions')
                  .update({
                    status: 'declined',
                    ended_at: new Date().toISOString()
                  })
                  .eq('id', newSession.id);
                
                toast({
                  title: 'Call Declined',
                  description: 'The call has been declined',
                });
              } catch (error) {
                console.error('❌ Error declining call:', error);
              }
            };
            
            toast({
              title: `Incoming ${modeLabel} Call`,
              description: `${initiatorRole} is calling you`,
              action: (
                <div className="flex gap-2">
                  <ToastAction altText="Decline" onClick={handleDeclineCall}>
                    Decline
                  </ToastAction>
                  <ToastAction altText="Answer" onClick={handleJoinCall}>
                    Answer
                  </ToastAction>
                </div>
              ),
              duration: 30000,
            });
          }
        }
      )
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
          
          // Handle session end
          if (updatedSession.status === 'ended' || updatedSession.status === 'declined') {
            setCommunicationMode(null);
            setAccessToken(null);
            setActiveSession(null);
            setSessionStartTime(null);
            sessionStartTimeRef.current = null;
            
            if (updatedSession.status === 'declined') {
              toast({
                title: 'Call Declined',
                description: 'The other party declined the call',
                variant: 'destructive',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, user?.id, isCurrentUserClient, createAccessToken]);

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

    // For video and voice, create active session and connect immediately
    try {
      console.log('🚀 Creating active session and connecting to:', mode);
      const token = await createAccessToken(caseId, mode);
      
      if (token) {
        // Connect initiator to Twilio immediately
        setAccessToken(token);
        setCommunicationMode(mode);
        const startTime = new Date();
        setSessionStartTime(startTime);
        sessionStartTimeRef.current = startTime;
        
        const modeLabel = mode === 'video' ? 'video' : 'voice';
        toast({
          title: 'Calling...',
          description: `Waiting for the other party to join the ${modeLabel} call`,
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
    console.log('🔴 Cancelling call...');

    if (activeSession) {
      try {
        console.log('Cancelling call for session:', activeSession.id);
        // Update session status to cancelled
        const { error } = await supabase
          .from('communication_sessions')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', activeSession.id);

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
                disabled={!communicationModes.video || connecting || !!activeCaseSession}
                className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''} ${!communicationModes.video ? 'opacity-50' : ''}`}
                title={!communicationModes.video ? 'Video calls are currently disabled' : ''}
              >
                <Video className="w-4 h-4" />
                Video Call
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleStartCommunication('voice')}
                disabled={!communicationModes.voice || connecting || !!activeCaseSession}
                className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''} ${!communicationModes.voice ? 'opacity-50' : ''}`}
                title={!communicationModes.voice ? 'Voice calls are currently disabled' : ''}
              >
                <Phone className="w-4 h-4" />
                Voice Call
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