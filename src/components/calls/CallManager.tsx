import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import { IncomingCallModal } from './IncomingCallModal';
import { DailyVideoCall } from './DailyVideoCall';
import { DailyVoiceCall } from './DailyVoiceCall';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ActiveCall {
  sessionId: string;
  roomUrl: string;
  type: 'video' | 'voice';
  callerName?: string;
}

export const CallManager: React.FC = () => {
  const { toast } = useToast();
  const { incomingCall, answerCall, declineCall, clearIncomingCall } = useCallNotifications();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const handleAnswer = async () => {
    if (!incomingCall) return;

    const success = await answerCall(incomingCall.id);
    
    if (success) {
      setActiveCall({
        sessionId: incomingCall.id,
        roomUrl: incomingCall.room_url,
        type: incomingCall.session_type,
        callerName: incomingCall.caller_name,
      });
      clearIncomingCall();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to answer call',
        variant: 'destructive',
      });
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;

    const success = await declineCall(incomingCall.id);
    
    if (!success) {
      toast({
        title: 'Error',
        description: 'Failed to decline call',
        variant: 'destructive',
      });
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;

    try {
      // Update session to ended
      await supabase
        .from('communication_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', activeCall.sessionId);

      setActiveCall(null);
      
      toast({
        title: 'Call Ended',
        description: 'The call has been ended successfully',
      });
    } catch (error) {
      console.error('Error ending call:', error);
      setActiveCall(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <IncomingCallModal
            callerName={incomingCall.caller_name || 'Unknown'}
            caseTitle={incomingCall.case_title || 'Legal Case'}
            callType={incomingCall.session_type}
            onAnswer={handleAnswer}
            onDecline={handleDecline}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCall && (
          <>
            {activeCall.type === 'video' ? (
              <DailyVideoCall
                roomUrl={activeCall.roomUrl}
                sessionId={activeCall.sessionId}
                onEnd={handleEndCall}
              />
            ) : (
              <DailyVoiceCall
                roomUrl={activeCall.roomUrl}
                sessionId={activeCall.sessionId}
                callerName={activeCall.callerName}
                onEnd={handleEndCall}
              />
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
};