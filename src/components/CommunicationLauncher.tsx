import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users, Video, Phone } from 'lucide-react';
import { DirectChatInterface } from './DirectChatInterface';
import { NotificationBadge } from './ui/notification-badge';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DailyVideoCall } from './calls/DailyVideoCall';
import { DailyVoiceCall } from './calls/DailyVoiceCall';

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
}) => {
  const { isRTL } = useLanguage();
  const { unreadCounts } = useChatNotifications();
  const { toast } = useToast();
  const [showDirectChat, setShowDirectChat] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    type: 'video' | 'voice';
    roomUrl: string;
    sessionId: string;
  } | null>(null);
  const [isCreatingCall, setIsCreatingCall] = useState(false);

  // Persist chat modal open state
  const storageKey = `directChatOpen:${caseId}`;
  
  useEffect(() => {
    const wasOpen = sessionStorage.getItem(storageKey) === '1';
    if (wasOpen) {
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

  const caseUnreadCount = unreadCounts[caseId] || 0;

  const handleStartCall = async (callType: 'video' | 'voice') => {
    try {
      setIsCreatingCall(true);
      console.log('📞 [CommunicationLauncher] Starting call:', { caseId, callType });

      const { data, error } = await supabase.functions.invoke('daily-room', {
        body: {
          caseId,
          sessionType: callType,
        },
      });

      console.log('📞 [CommunicationLauncher] Room creation response:', { data, error });

      if (error) {
        console.error('🔴 [CommunicationLauncher] Error creating room:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to create call room',
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        console.log('✅ [CommunicationLauncher] Room created successfully');
        console.log('📞 [CommunicationLauncher] Room URL:', data.roomUrl);
        console.log('📞 [CommunicationLauncher] Session ID:', data.sessionId);
        
        // Immediately join the room as the initiator
        setActiveCall({
          type: callType,
          roomUrl: data.roomUrl,
          sessionId: data.sessionId,
        });
        
        toast({
          title: 'Connecting...',
          description: 'Joining call room...',
        });
      }
    } catch (error) {
      console.error('🔴 [CommunicationLauncher] Error starting call:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate call',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingCall(false);
    }
  };

  const handleEndCall = async () => {
    if (activeCall) {
      try {
        await supabase
          .from('communication_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', activeCall.sessionId);
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    setActiveCall(null);
  };

  // Show active call if there is one
  if (activeCall) {
    console.log('🔍 [CommunicationLauncher] About to render call component with:', {
      type: activeCall.type,
      roomUrl: activeCall.roomUrl,
      sessionId: activeCall.sessionId,
      roomUrlValid: activeCall.roomUrl?.includes('daily.co'),
      roomUrlLength: activeCall.roomUrl?.length,
      urlStartsWith: activeCall.roomUrl?.substring(0, 30)
    });
    
    if (activeCall.type === 'video') {
      return (
        <DailyVideoCall
          roomUrl={activeCall.roomUrl}
          sessionId={activeCall.sessionId}
          onEnd={handleEndCall}
        />
      );
    } else {
      return (
        <DailyVoiceCall
          roomUrl={activeCall.roomUrl}
          sessionId={activeCall.sessionId}
          onEnd={handleEndCall}
        />
      );
    }
  }

  // Show direct chat interface if open
  if (showDirectChat) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-2xl">
          <DirectChatInterface
            caseId={caseId}
            caseTitle={caseTitle}
            onClose={() => setShowDirectChat(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isRTL() ? 'rtl-dir' : ''}`}>
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse justify-end' : ''}`}>
            <MessageCircle className="w-5 h-5" />
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
            <div className="space-y-4">
              {/* Call buttons in a row */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleStartCall('video')}
                  disabled={isCreatingCall}
                  className={`flex items-center justify-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}
                  variant="secondary"
                  size="lg"
                >
                  <Video className="w-5 h-5" />
                  <span>Video Call</span>
                </Button>

                <Button
                  onClick={() => handleStartCall('voice')}
                  disabled={isCreatingCall}
                  className={`flex items-center justify-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}
                  variant="secondary"
                  size="lg"
                >
                  <Phone className="w-5 h-5" />
                  <span>Voice Call</span>
                </Button>
              </div>

              {/* Direct chat button */}
              <div className="relative">
                <Button
                  onClick={() => setShowDirectChat(true)}
                  className={`w-full flex items-center justify-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}
                  size="lg"
                >
                  <MessageCircle className="w-5 h-5" />
                  Open Direct Chat
                </Button>
                {caseUnreadCount > 0 && (
                  <div className="absolute -top-2 -right-2">
                    <NotificationBadge count={caseUnreadCount} />
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Choose your preferred communication method
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
