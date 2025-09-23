import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Monitor, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TwilioAccessToken } from '@/hooks/useTwilioSession';

interface TwilioVideoInterfaceProps {
  accessToken: TwilioAccessToken;
  onDisconnect: () => void;
}

// Mock Twilio Video SDK types (in production, install @twilio/video)
interface MockRoom {
  disconnect: () => void;
  localParticipant: {
    videoTracks: Map<string, any>;
    audioTracks: Map<string, any>;
  };
  participants: Map<string, any>;
  on: (event: string, callback: (participant?: any) => void) => void;
}

export const TwilioVideoInterface: React.FC<TwilioVideoInterfaceProps> = ({
  accessToken,
  onDisconnect
}) => {
  const [room, setRoom] = useState<MockRoom | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // In production, this would use the actual Twilio Video SDK
    // For now, we'll mock the connection
    const connectToRoom = async () => {
      try {
        console.log('Connecting to Twilio room:', accessToken.roomName);
        
        // Mock connection
        const mockRoom: MockRoom = {
          disconnect: () => {
            setConnected(false);
            setRoom(null);
            toast({
              title: 'Disconnected',
              description: 'Left the video session',
            });
          },
          localParticipant: {
            videoTracks: new Map(),
            audioTracks: new Map()
          },
          participants: new Map(),
          on: (event: string, callback: (participant?: any) => void) => {
            // Mock event handlers
            if (event === 'participantConnected') {
              setTimeout(() => {
                callback({ identity: 'remote-participant' });
                setParticipants(prev => [...prev, 'remote-participant']);
              }, 2000);
            }
          }
        };

        setRoom(mockRoom);
        setConnected(true);
        
        // Mock local video stream
        if (localVideoRef.current) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: videoEnabled, 
              audio: audioEnabled 
            });
            localVideoRef.current.srcObject = stream;
          } catch (error) {
            console.error('Error accessing media devices:', error);
            toast({
              title: 'Camera Error',
              description: 'Unable to access camera or microphone',
              variant: 'destructive',
            });
          }
        }

        toast({
          title: 'Connected',
          description: `Joined video session: ${accessToken.roomName}`,
        });

      } catch (error) {
        console.error('Error connecting to room:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to join video session',
          variant: 'destructive',
        });
      }
    };

    connectToRoom();

    // Browser cleanup event listeners
    const handleBeforeUnload = () => {
      if (room && connected) {
        room.disconnect();
        onDisconnect();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && room && connected) {
        // Give user 30 seconds before auto-disconnect
        setTimeout(() => {
          if (document.visibilityState === 'hidden' && connected) {
            room.disconnect();
            onDisconnect();
          }
        }, 30000);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (room) {
        room.disconnect();
      }
    };
  }, [accessToken, videoEnabled, audioEnabled, onDisconnect, room, connected]);

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
    // In production, this would toggle the actual video track
    toast({
      title: videoEnabled ? 'Video Off' : 'Video On',
      description: `Camera ${videoEnabled ? 'disabled' : 'enabled'}`,
    });
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    // In production, this would toggle the actual audio track
    toast({
      title: audioEnabled ? 'Muted' : 'Unmuted',
      description: `Microphone ${audioEnabled ? 'disabled' : 'enabled'}`,
    });
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        // In production, this would start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setScreenSharing(true);
        toast({
          title: 'Screen Share Started',
          description: 'Sharing your screen with participants',
        });
      } else {
        // Stop screen sharing and return to camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: audioEnabled });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setScreenSharing(false);
        toast({
          title: 'Screen Share Stopped',
          description: 'Returned to camera view',
        });
      }
    } catch (error) {
      console.error('Error with screen sharing:', error);
      toast({
        title: 'Screen Share Error',
        description: 'Unable to share screen',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('Disconnecting from video session...');
      
      if (room) {
        room.disconnect();
      }
      
      setConnected(false);
      setParticipants([]);
      setRoom(null);
      
      // Call the parent disconnect handler with await to ensure proper cleanup
      await onDisconnect();
      
      toast({
        title: 'Call Ended',
        description: 'You have left the video call',
      });
    } catch (error) {
      console.error('Error during disconnect:', error);
      // Still call onDisconnect even if there's an error
      onDisconnect();
      
      toast({
        title: 'Call Ended',
        description: 'Call ended with cleanup warnings',
        variant: 'destructive',
      });
    }
  };

  // Enhanced cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('TwilioVideoInterface unmounting, cleaning up...');
      if (room && connected) {
        try {
          room.disconnect();
          // Force disconnect callback to ensure session cleanup
          onDisconnect();
        } catch (error) {
          console.error('Error during component unmount cleanup:', error);
        }
      }
    };
  }, [room, connected, onDisconnect]);


  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Video Session: {accessToken.roomName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? 'Connected' : 'Connecting...'}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {participants.length + 1}
            </Badge>
            <Badge variant="destructive">
              🔴 Recording
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-96">
          {/* Local Video */}
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary">You</Badge>
            </div>
            {!videoEnabled && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <VideoOff className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Remote Video */}
          <div className="relative bg-muted rounded-lg overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary">
                {participants.length > 0 ? 'Remote Participant' : 'Waiting...'}
              </Badge>
            </div>
            {participants.length === 0 && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2" />
                  <p>Waiting for others to join...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant={videoEnabled ? "default" : "destructive"}
            size="sm"
            onClick={toggleVideo}
            className="flex items-center gap-2"
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            {videoEnabled ? 'Video On' : 'Video Off'}
          </Button>

          <Button
            variant={audioEnabled ? "default" : "destructive"}
            size="sm"
            onClick={toggleAudio}
            className="flex items-center gap-2"
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {audioEnabled ? 'Unmuted' : 'Muted'}
          </Button>

          <Button
            variant={screenSharing ? "secondary" : "outline"}
            size="sm"
            onClick={toggleScreenShare}
            className="flex items-center gap-2"
          >
            <Monitor className="w-4 h-4" />
            {screenSharing ? 'Stop Sharing' : 'Share Screen'}
          </Button>


          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            className="flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </Button>
        </div>

        {/* Session Info */}
        <div className="text-sm text-muted-foreground text-center">
          Session ID: {accessToken.sessionId} | Identity: {accessToken.identity}
        </div>
      </CardContent>
    </Card>
  );
};