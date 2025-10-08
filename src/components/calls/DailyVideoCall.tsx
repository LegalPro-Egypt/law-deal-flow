import React, { useEffect, useRef, useState } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyVideoCallProps {
  roomUrl: string;
  sessionId: string;
  onEnd: () => void;
}

export const DailyVideoCall: React.FC<DailyVideoCallProps> = ({
  roomUrl,
  sessionId,
  onEnd,
}) => {
  const callRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [callState, setCallState] = useState<'initializing' | 'loading' | 'joining' | 'joined' | 'error'>('initializing');
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const initCall = async () => {
      try {
        console.log('🎥 [DailyVideoCall] Props received:', { roomUrl, sessionId });
        console.log('🎥 [DailyVideoCall] Initializing video call...');
        
        if (!containerRef.current) {
          console.error('🔴 [DailyVideoCall] Container ref not ready');
          setCallState('error');
          return;
        }

        setCallState('loading');
        
        const call = DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: false,
          showFullscreenButton: true,
          iframeStyle: {
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: 'none',
          },
        });

        callRef.current = call;
        console.log('🎥 [DailyVideoCall] Daily frame created');

        // Set up comprehensive event listeners
        call.on('loading', () => {
          console.log('🔵 [DailyVideoCall] Loading...');
          setCallState('loading');
        });

        call.on('loaded', () => {
          console.log('🔵 [DailyVideoCall] Loaded');
        });

        call.on('joining-meeting', () => {
          console.log('🔵 [DailyVideoCall] Joining meeting...');
          setCallState('joining');
        });

        call.on('joined-meeting', () => {
          console.log('✅ [DailyVideoCall] Joined meeting successfully!');
          console.log('👥 [DailyVideoCall] Current participants:', Object.keys(call.participants()).length);
          setCallState('joined');
        });

        call.on('participant-joined', (event) => {
          console.log('👤 [DailyVideoCall] Participant joined:', event.participant.user_name || 'Anonymous');
          console.log('👥 [DailyVideoCall] Total participants:', Object.keys(call.participants()).length);
        });

        call.on('participant-left', (event) => {
          console.log('👋 [DailyVideoCall] Participant left:', event.participant.user_name || 'Anonymous');
          console.log('👥 [DailyVideoCall] Remaining participants:', Object.keys(call.participants()).length);
        });

        call.on('error', (error) => {
          console.error('🔴 [DailyVideoCall] Daily.co error:', error);
          setCallState('error');
        });

        call.on('left-meeting', () => {
          console.log('👋 [DailyVideoCall] Left meeting');
          onEnd();
        });

        // Join the room
        console.log('🎥 [DailyVideoCall] Attempting to join room:', roomUrl);
        setCallState('joining');
        
        const joinResult = await call.join({ url: roomUrl });
        console.log('🎥 [DailyVideoCall] Join result:', joinResult);
        
      } catch (error) {
        console.error('🔴 [DailyVideoCall] Error initializing call:', error);
        setCallState('error');
      }
    };

    initCall();

    return () => {
      if (callRef.current) {
        console.log('🧹 [DailyVideoCall] Cleaning up call');
        callRef.current.destroy();
      }
    };
  }, [roomUrl, sessionId, onEnd]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    if (showControls && callState === 'joined') {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, callState]);

  const toggleAudio = () => {
    if (callRef.current) {
      callRef.current.setLocalAudio(!isAudioMuted);
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (callRef.current) {
      callRef.current.setLocalVideo(!isVideoMuted);
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const endCall = async () => {
    if (callRef.current) {
      await callRef.current.leave();
    }
    onEnd();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-gray-100"
      onMouseMove={handleMouseMove}
    >
      {/* Daily.co iframe container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Connection status overlay */}
      {callState !== 'joined' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center space-y-4">
            {callState === 'initializing' && (
              <div className="text-gray-800 text-xl">Initializing call...</div>
            )}
            {callState === 'loading' && (
              <div className="text-gray-800 text-xl">Loading video interface...</div>
            )}
            {callState === 'joining' && (
              <div className="text-gray-800 text-xl">Connecting to call room...</div>
            )}
            {callState === 'error' && (
              <>
                <div className="text-red-600 text-xl">Connection Failed</div>
                <Button onClick={onEnd} variant="secondary">
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && callState === 'joined' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 rounded-full bg-black/60 backdrop-blur-xl border border-white/10"
          >
            <Button
              onClick={toggleAudio}
              size="lg"
              variant={isAudioMuted ? 'destructive' : 'secondary'}
              className="rounded-full w-14 h-14"
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button
              onClick={toggleVideo}
              size="lg"
              variant={isVideoMuted ? 'destructive' : 'secondary'}
              className="rounded-full w-14 h-14"
            >
              {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>

            <Button
              onClick={endCall}
              size="lg"
              variant="destructive"
              className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};