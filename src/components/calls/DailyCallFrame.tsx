import React, { useEffect, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';

interface DailyCallFrameProps {
  roomUrl: string;
  onEnd: () => void;
}

export const DailyCallFrame: React.FC<DailyCallFrameProps> = ({ roomUrl, onEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !roomUrl) {
      console.error('❌ [DailyCallFrame] Missing container or roomUrl');
      return;
    }

    console.log('📞 [DailyCallFrame] Initializing call frame with roomUrl:', roomUrl);

    // Create iframe with Daily's built-in UI
    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
      },
      showLeaveButton: true,
    });

    callFrameRef.current = callFrame;

    console.log('📞 [DailyCallFrame] Joining room...');
    
    // Join the room
    callFrame.join({ url: roomUrl })
      .then(() => {
        console.log('✅ [DailyCallFrame] Successfully joined room');
      })
      .catch((error) => {
        console.error('❌ [DailyCallFrame] Failed to join room:', error);
      });

    // Handle when user leaves
    callFrame.on('left-meeting', () => {
      console.log('👋 [DailyCallFrame] User left meeting');
      onEnd();
    });

    return () => {
      console.log('🧹 [DailyCallFrame] Cleaning up call frame');
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, [roomUrl, onEnd]);

  return <div ref={containerRef} className="fixed inset-0 z-[9999]" />;
};
