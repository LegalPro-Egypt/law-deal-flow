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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const joinTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const initCall = async () => {
      try {
        console.log('🎥 [DailyVideoCall] ===== VIDEO CALL INITIALIZATION =====');
        console.log('🎥 [DailyVideoCall] Props received:', { roomUrl, sessionId });
        console.log('🎥 [DailyVideoCall] Room URL format check:', {
          isValid: roomUrl?.includes('daily.co'),
          length: roomUrl?.length,
          url: roomUrl
        });
        
        if (!roomUrl) {
          console.error('🔴 [DailyVideoCall] No room URL provided!');
          setErrorMessage('No room URL provided');
          setCallState('error');
          return;
        }

        if (!roomUrl.includes('daily.co')) {
          console.error('🔴 [DailyVideoCall] Invalid room URL format:', roomUrl);
          setErrorMessage('Invalid room URL format');
          setCallState('error');
          return;
        }
        
        if (!containerRef.current) {
          console.error('🔴 [DailyVideoCall] Container ref not ready');
          setErrorMessage('Video container not ready');
          setCallState('error');
          return;
        }

        setCallState('loading');
        console.log('🎥 [DailyVideoCall] Creating Daily frame...');
        
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
        console.log('✅ [DailyVideoCall] Daily frame created successfully');

        // Set up comprehensive event listeners
        call.on('loading', () => {
          console.log('🔵 [DailyVideoCall] Event: loading');
          setCallState('loading');
        });

        call.on('loaded', () => {
          console.log('🔵 [DailyVideoCall] Event: loaded');
        });

        call.on('joining-meeting', () => {
          console.log('🔵 [DailyVideoCall] Event: joining-meeting');
          setCallState('joining');
        });

        call.on('joined-meeting', (event) => {
          console.log('✅ [DailyVideoCall] Event: joined-meeting');
          console.log('👥 [DailyVideoCall] Participants:', event?.participants);
          console.log('👥 [DailyVideoCall] Total count:', Object.keys(call.participants()).length);
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
          }
          setCallState('joined');
        });

        call.on('participant-joined', (event) => {
          console.log('👤 [DailyVideoCall] Event: participant-joined', {
            userName: event.participant.user_name || 'Anonymous',
            userId: event.participant.user_id,
            sessionId: event.participant.session_id
          });
          console.log('👥 [DailyVideoCall] Total participants now:', Object.keys(call.participants()).length);
        });

        call.on('participant-left', (event) => {
          console.log('👋 [DailyVideoCall] Event: participant-left', {
            userName: event.participant.user_name || 'Anonymous',
            userId: event.participant.user_id
          });
          console.log('👥 [DailyVideoCall] Remaining participants:', Object.keys(call.participants()).length);
        });

        call.on('error', (error) => {
          console.error('🔴 [DailyVideoCall] Event: error', error);
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
          }
          setErrorMessage(error?.errorMsg || 'Connection error occurred');
          setCallState('error');
        });

        call.on('left-meeting', () => {
          console.log('👋 [DailyVideoCall] Event: left-meeting');
          onEnd();
        });

        // Set join timeout (15 seconds)
        joinTimeoutRef.current = setTimeout(() => {
          console.error('🔴 [DailyVideoCall] Join timeout after 15 seconds');
          setErrorMessage('Connection timeout - please try again');
          setCallState('error');
          if (callRef.current) {
            callRef.current.destroy();
            callRef.current = null;
          }
        }, 15000);

        // Join the room
        console.log('🎥 [DailyVideoCall] ===== JOINING ROOM =====');
        console.log('🎥 [DailyVideoCall] Room URL:', roomUrl);
        setCallState('joining');
        
        const joinResult = await call.join({ url: roomUrl });
        console.log('✅ [DailyVideoCall] Join result:', joinResult);
        console.log('🎥 [DailyVideoCall] Meeting state:', call.meetingState());
        
      } catch (error: any) {
        console.error('🔴 [DailyVideoCall] Error initializing call:', error);
        console.error('🔴 [DailyVideoCall] Error details:', {
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
    console.log('🎥 [DailyVideoCall] Ending call...');
    if (callRef.current) {
      await callRef.current.leave();
    }
    onEnd();
  };

  const retryConnection = () => {
    console.log('🔄 [DailyVideoCall] Retrying connection...');
    setCallState('initializing');
    setErrorMessage('');
    window.location.reload(); // Simple retry by reloading
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
          <div className="text-center space-y-4 max-w-md px-6">
            {callState === 'initializing' && (
              <div className="text-gray-800 text-xl">Initializing call...</div>
            )}
            {callState === 'loading' && (
              <div className="text-gray-800 text-xl">Loading video interface...</div>
            )}
            {callState === 'joining' && (
              <>
                <div className="text-gray-800 text-xl">Connecting to call room...</div>
                <div className="text-gray-500 text-sm">This may take a few moments</div>
              </>
            )}
            {callState === 'error' && (
              <>
                <div className="text-red-600 text-xl font-semibold mb-2">Connection Failed</div>
                {errorMessage && (
                  <div className="text-gray-600 text-sm mb-4">{errorMessage}</div>
                )}
                <div className="flex gap-2 justify-center">
                  <Button onClick={retryConnection} variant="default">
                    Retry
                  </Button>
                  <Button onClick={onEnd} variant="secondary">
                    Close
                  </Button>
                </div>
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