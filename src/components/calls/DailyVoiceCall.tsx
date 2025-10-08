import React, { useEffect, useRef, useState } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface DailyVoiceCallProps {
  roomUrl: string;
  sessionId: string;
  callerName?: string;
  onEnd: () => void;
}

export const DailyVoiceCall: React.FC<DailyVoiceCallProps> = ({
  roomUrl,
  sessionId,
  callerName = 'Lawyer',
  onEnd,
}) => {
  const callRef = useRef<DailyCall | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callState, setCallState] = useState<'joining' | 'joined' | 'error'>('joining');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const joinTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const initCall = async () => {
      try {
        console.log('🎤 [DailyVoiceCall] ===== VOICE CALL INITIALIZATION =====');
        console.log('🎤 [DailyVoiceCall] Props received:', { roomUrl, sessionId, callerName });
        console.log('🎤 [DailyVoiceCall] Room URL format check:', {
          isValid: roomUrl?.includes('daily.co'),
          length: roomUrl?.length,
          url: roomUrl
        });
        
        if (!roomUrl) {
          console.error('🔴 [DailyVoiceCall] No room URL provided!');
          setErrorMessage('No room URL provided');
          setCallState('error');
          return;
        }

        if (!roomUrl.includes('daily.co')) {
          console.error('🔴 [DailyVoiceCall] Invalid room URL format:', roomUrl);
          setErrorMessage('Invalid room URL format');
          setCallState('error');
          return;
        }
        
        setCallState('joining');
        console.log('🎤 [DailyVoiceCall] Creating Daily call object...');
        
        const call = DailyIframe.createCallObject({
          audioSource: true,
          videoSource: false,
        });

        callRef.current = call;
        console.log('✅ [DailyVoiceCall] Daily call object created successfully');

        // Set up comprehensive event listeners
        call.on('loading', () => {
          console.log('🔵 [DailyVoiceCall] Event: loading');
        });

        call.on('loaded', () => {
          console.log('🔵 [DailyVoiceCall] Event: loaded');
        });

        call.on('joining-meeting', () => {
          console.log('🔵 [DailyVoiceCall] Event: joining-meeting');
          setCallState('joining');
        });

        call.on('joined-meeting', (event) => {
          console.log('✅ [DailyVoiceCall] Event: joined-meeting');
          console.log('👥 [DailyVoiceCall] Participants:', event?.participants);
          console.log('👥 [DailyVoiceCall] Total count:', Object.keys(call.participants()).length);
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
          }
          setCallState('joined');
        });

        call.on('participant-joined', (event) => {
          console.log('👤 [DailyVoiceCall] Event: participant-joined', {
            userName: event.participant.user_name || 'Anonymous',
            userId: event.participant.user_id,
            sessionId: event.participant.session_id
          });
          console.log('👥 [DailyVoiceCall] Total participants now:', Object.keys(call.participants()).length);
        });

        call.on('participant-left', (event) => {
          console.log('👋 [DailyVoiceCall] Event: participant-left', {
            userName: event.participant.user_name || 'Anonymous',
            userId: event.participant.user_id
          });
          console.log('👥 [DailyVoiceCall] Remaining participants:', Object.keys(call.participants()).length);
        });

        call.on('error', (error) => {
          console.error('🔴 [DailyVoiceCall] Event: error', error);
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
          }
          setErrorMessage(error?.errorMsg || 'Connection error occurred');
          setCallState('error');
        });

        call.on('left-meeting', () => {
          console.log('👋 [DailyVoiceCall] Event: left-meeting');
          onEnd();
        });

        call.on('active-speaker-change', (event: any) => {
          console.log('🔊 [DailyVoiceCall] Event: active-speaker-change', event?.activeSpeaker?.peerId);
          setIsSpeaking(event.activeSpeaker?.peerId !== call.participants().local.session_id);
        });

        // Set join timeout (15 seconds)
        joinTimeoutRef.current = setTimeout(() => {
          console.error('🔴 [DailyVoiceCall] Join timeout after 15 seconds');
          setErrorMessage('Connection timeout - please try again');
          setCallState('error');
          if (callRef.current) {
            callRef.current.destroy();
            callRef.current = null;
          }
        }, 15000);

        // Join the room
        console.log('🎤 [DailyVoiceCall] ===== JOINING ROOM =====');
        console.log('🎤 [DailyVoiceCall] Room URL:', roomUrl);
        
        const joinResult = await call.join({ url: roomUrl });
        console.log('✅ [DailyVoiceCall] Join result:', joinResult);
        console.log('🎤 [DailyVoiceCall] Meeting state:', call.meetingState());
        
      } catch (error: any) {
        console.error('🔴 [DailyVoiceCall] Error initializing voice call:', error);
        console.error('🔴 [DailyVoiceCall] Error details:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name
        });
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current);
        }
        setErrorMessage(error?.message || 'Failed to initialize call');
        setCallState('error');
      }
    };

    initCall();

    return () => {
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
      }
      if (callRef.current) {
        console.log('🧹 [DailyVoiceCall] Cleaning up call');
        callRef.current.destroy();
      }
    };
  }, [roomUrl, sessionId, callerName, onEnd]);

  // Call duration timer
  useEffect(() => {
    if (callState !== 'joined') return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAudio = () => {
    if (callRef.current) {
      callRef.current.setLocalAudio(!isAudioMuted);
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleSpeaker = () => {
    // Note: Speaker toggle is more of a UI indication
    // Actual speaker control depends on device settings
    setIsSpeakerOn(!isSpeakerOn);
  };

  const endCall = async () => {
    console.log('🎤 [DailyVoiceCall] Ending call...');
    if (callRef.current) {
      await callRef.current.leave();
    }
    onEnd();
  };

  const retryConnection = () => {
    console.log('🔄 [DailyVoiceCall] Retrying connection...');
    setCallState('joining');
    setErrorMessage('');
    window.location.reload(); // Simple retry by reloading
  };

  const initials = callerName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-gray-100 flex flex-col items-center justify-center"
    >
      {/* Avatar with pulse animation */}
      <div className="relative mb-8">
        <Avatar className="w-32 h-32">
          <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {isSpeaking && callState === 'joined' && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full bg-primary/30"
          />
        )}
      </div>

      {/* Caller name */}
      <h2 className="text-gray-800 text-3xl font-semibold mb-2">{callerName}</h2>

      {/* Call status/duration */}
      <div className="text-gray-600 text-lg mb-12">
        {callState === 'joining' && (
          <div className="space-y-2">
            <div>Connecting...</div>
            <div className="text-sm text-gray-500">This may take a few moments</div>
          </div>
        )}
        {callState === 'joined' && formatDuration(callDuration)}
        {callState === 'error' && (
          <div className="space-y-2">
            <div className="text-red-600 font-semibold">Connection Error</div>
            {errorMessage && <div className="text-sm text-gray-600">{errorMessage}</div>}
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-6">
        {callState === 'error' ? (
          <>
            <Button
              onClick={retryConnection}
              size="lg"
              variant="default"
              className="rounded-full px-8"
            >
              Retry
            </Button>
            <Button
              onClick={endCall}
              size="lg"
              variant="secondary"
              className="rounded-full px-8"
            >
              Close
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={toggleAudio}
              size="lg"
              variant={isAudioMuted ? 'destructive' : 'secondary'}
              className="rounded-full w-16 h-16"
              disabled={callState !== 'joined'}
            >
              {isAudioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            <Button
              onClick={toggleSpeaker}
              size="lg"
              variant={!isSpeakerOn ? 'destructive' : 'secondary'}
              className="rounded-full w-16 h-16"
              disabled={callState !== 'joined'}
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </Button>

            <Button
              onClick={endCall}
              size="lg"
              variant="destructive"
              className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
            >
              <X className="w-6 h-6" />
            </Button>
          </>
        )}
      </div>

      {/* Labels */}
      {callState !== 'error' && (
        <div className="flex items-center gap-6 mt-4">
          <span className="text-gray-500 text-sm w-16 text-center">
            {isAudioMuted ? 'Unmute' : 'Mute'}
          </span>
          <span className="text-gray-500 text-sm w-16 text-center">
            {isSpeakerOn ? 'Speaker' : 'Muted'}
          </span>
          <span className="text-gray-500 text-sm w-16 text-center">End Call</span>
        </div>
      )}
    </motion.div>
  );
};