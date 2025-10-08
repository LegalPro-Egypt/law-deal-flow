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
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [callState, setCallState] = useState<'joining' | 'joined' | 'error'>('joining');
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const initCall = async () => {
      try {
        console.log('Initializing Daily.co video call:', roomUrl);
        
        const call = DailyIframe.createCallObject({
          audioSource: true,
          videoSource: true,
        });

        callRef.current = call;

        // Set up event listeners
        call.on('joined-meeting', () => {
          console.log('Joined meeting successfully');
          setCallState('joined');
        });

        call.on('error', (error) => {
          console.error('Daily.co error:', error);
          setCallState('error');
        });

        call.on('left-meeting', () => {
          console.log('Left meeting');
          onEnd();
        });

        // Join the room
        await call.join({ url: roomUrl });
      } catch (error) {
        console.error('Error initializing call:', error);
        setCallState('error');
      }
    };

    initCall();

    return () => {
      if (callRef.current) {
        callRef.current.destroy();
      }
    };
  }, [roomUrl, onEnd]);

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
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"
      onMouseMove={handleMouseMove}
    >
      {/* Daily.co iframe container */}
      <div id="daily-call-container" className="absolute inset-0">
        {callState === 'joining' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-xl">Connecting...</div>
          </div>
        )}
        
        {callState === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-white text-xl">Connection Error</div>
            <Button onClick={onEnd} variant="secondary">
              Close
            </Button>
          </div>
        )}
      </div>

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