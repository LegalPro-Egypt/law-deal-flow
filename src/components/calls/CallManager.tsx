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

    console.log('📞 [CallManager] Answering call:', {
      sessionId: incomingCall.id,
      roomUrl: incomingCall.room_url,
      type: incomingCall.session_type,
    });

    const success = await answerCall(incomingCall.id);
    
    if (success) {
      console.log('✅ [CallManager] Call answered, setting active call');
      setActiveCall({
        sessionId: incomingCall.id,
        roomUrl: incomingCall.room_url,
        type: incomingCall.session_type,
        callerName: incomingCall.caller_name,
      });
      clearIncomingCall();
    } else {
      console.error('🔴 [CallManager] Failed to answer call');
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

    console.log('👋 [CallManager] Ending call:', {
      sessionId: activeCall.sessionId,
      type: activeCall.type,
    });

    try {
      // Update session to ended
      await supabase
        .from('communication_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', activeCall.sessionId);

      console.log('✅ [CallManager] Call ended, clearing active call state');
      setActiveCall(null);
      
      toast({
        title: 'Call Ended',
        description: 'The call has been ended successfully',
      });
    } catch (error) {
      console.error('🔴 [CallManager] Error ending call:', error);
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
            {console.log('🔍 [CallManager] About to render call component with:', {
              type: activeCall.type,
              roomUrl: activeCall.roomUrl,
              sessionId: activeCall.sessionId,
              callerName: activeCall.callerName,
              roomUrlValid: activeCall.roomUrl?.includes('daily.co'),
              roomUrlLength: activeCall.roomUrl?.length,
              urlStartsWith: activeCall.roomUrl?.substring(0, 30)
            })}
            
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