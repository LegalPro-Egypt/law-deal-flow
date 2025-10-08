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

  useEffect(() => {
    const initCall = async () => {
      try {
        console.log('🎤 [DailyVoiceCall] Props received:', { roomUrl, sessionId, callerName });
        console.log('🎤 [DailyVoiceCall] Initializing voice call...');
        
        setCallState('joining');
        
        const call = DailyIframe.createCallObject({
          audioSource: true,
          videoSource: false,
        });

        callRef.current = call;
        console.log('🎤 [DailyVoiceCall] Daily call object created');

        // Set up comprehensive event listeners
        call.on('loading', () => {
          console.log('🔵 [DailyVoiceCall] Loading...');
        });

        call.on('loaded', () => {
          console.log('🔵 [DailyVoiceCall] Loaded');
        });

        call.on('joining-meeting', () => {
          console.log('🔵 [DailyVoiceCall] Joining meeting...');
          setCallState('joining');
        });

        call.on('joined-meeting', () => {
          console.log('✅ [DailyVoiceCall] Joined voice call successfully!');
          console.log('👥 [DailyVoiceCall] Current participants:', Object.keys(call.participants()).length);
          setCallState('joined');
        });

        call.on('participant-joined', (event) => {
          console.log('👤 [DailyVoiceCall] Participant joined:', event.participant.user_name || 'Anonymous');
          console.log('👥 [DailyVoiceCall] Total participants:', Object.keys(call.participants()).length);
        });

        call.on('participant-left', (event) => {
          console.log('👋 [DailyVoiceCall] Participant left:', event.participant.user_name || 'Anonymous');
          console.log('👥 [DailyVoiceCall] Remaining participants:', Object.keys(call.participants()).length);
        });

        call.on('error', (error) => {
          console.error('🔴 [DailyVoiceCall] Daily.co error:', error);
          setCallState('error');
        });

        call.on('left-meeting', () => {
          console.log('👋 [DailyVoiceCall] Left voice call');
          onEnd();
        });

        call.on('active-speaker-change', (event: any) => {
          console.log('🔊 [DailyVoiceCall] Active speaker:', event?.activeSpeaker?.peerId);
          setIsSpeaking(event.activeSpeaker?.peerId !== call.participants().local.session_id);
        });

        // Join the room
        console.log('🎤 [DailyVoiceCall] Attempting to join room:', roomUrl);
        const joinResult = await call.join({ url: roomUrl });
        console.log('🎤 [DailyVoiceCall] Join result:', joinResult);
        
      } catch (error) {
        console.error('🔴 [DailyVoiceCall] Error initializing voice call:', error);
        setCallState('error');
      }
    };

    initCall();

    return () => {
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
    if (callRef.current) {
      await callRef.current.leave();
    }
    onEnd();
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
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center"
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
      <h2 className="text-white text-3xl font-semibold mb-2">{callerName}</h2>

      {/* Call status/duration */}
      <div className="text-white/70 text-lg mb-12">
        {callState === 'joining' && 'Connecting...'}
        {callState === 'joined' && formatDuration(callDuration)}
        {callState === 'error' && 'Connection Error'}
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-6">
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
      </div>

      {/* Labels */}
      <div className="flex items-center gap-6 mt-4">
        <span className="text-white/60 text-sm w-16 text-center">
          {isAudioMuted ? 'Unmute' : 'Mute'}
        </span>
        <span className="text-white/60 text-sm w-16 text-center">
          {isSpeakerOn ? 'Speaker' : 'Muted'}
        </span>
        <span className="text-white/60 text-sm w-16 text-center">End Call</span>
      </div>
    </motion.div>
  );
};