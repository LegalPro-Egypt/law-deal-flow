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
    setIsCreatingCall(true);
    
    try {
      console.log('🔵 Invoking daily-room edge function:', {
        caseId,
        sessionType: callType,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase.functions.invoke('daily-room', {
        body: {
          caseId,
          sessionType: callType,
        },
      });

      console.log('🔵 Edge function response:', {
        data,
        error,
        hasData: !!data,
        hasError: !!error
      });

      if (error) {
        console.error('🔴 Edge function error:', error);
        console.error('🔴 Full error object:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Failed to invoke edge function');
      }

      if (!data) {
        throw new Error('No response data from edge function');
      }

      if (data.success) {
        console.log('✅ Call room created successfully:', {
          sessionId: data.sessionId,
          roomName: data.roomName
        });

        setActiveCall({
          type: callType,
          roomUrl: data.roomUrl,
          sessionId: data.sessionId,
        });
        toast({
          title: "Call Started",
          description: `${callType === 'video' ? 'Video' : 'Voice'} call has been initiated.`,
        });
      } else {
        console.error('🔴 Edge function returned error:', {
          error: data.error,
          details: data.details,
          stack: data.stack
        });
        throw new Error(data.error || data.details || 'Failed to create call room');
      }
    } catch (error: any) {
      console.error('🔴 Error starting call:', error);
      console.error('🔴 Full error object:', JSON.stringify(error, null, 2));
      
      toast({
        title: "Error Starting Call",
        description: error.message || "Failed to start call. Please check console logs for details.",
        variant: "destructive",
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
