import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Mic, MicOff, Users, Volume2, VolumeX } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TwilioAccessToken } from '@/hooks/useTwilioSession';

interface TwilioVoiceInterfaceProps {
  accessToken: TwilioAccessToken;
  onDisconnect: () => void;
}

export const TwilioVoiceInterface: React.FC<TwilioVoiceInterfaceProps> = ({
  accessToken,
  onDisconnect
}) => {
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Mock connection to Twilio Voice
    const connectToVoiceCall = async () => {
      try {
        console.log('Connecting to Twilio voice call:', accessToken.roomName);
        
        // Mock getting audio stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        setConnected(true);
        
        // Start call timer
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);

        // Mock participant joining
        setTimeout(() => {
          setParticipants(['remote-participant']);
          toast({
            title: 'Participant Joined',
            description: 'Another participant has joined the call',
          });
        }, 2000);

        // Mock connection quality changes
        setTimeout(() => {
          setConnectionQuality('good');
        }, 10000);

        toast({
          title: 'Voice Call Connected',
          description: `Connected to voice session: ${accessToken.roomName}`,
        });

      } catch (error) {
        console.error('Error connecting to voice call:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to join voice call',
          variant: 'destructive',
        });
      }
    };

    connectToVoiceCall();

    // Browser cleanup event listeners
    const handleBeforeUnload = () => {
      if (connected) {
        onDisconnect();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && connected) {
        // Give user 30 seconds before auto-disconnect
        setTimeout(() => {
          if (document.visibilityState === 'hidden' && connected) {
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
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [accessToken, onDisconnect, connected]);

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    toast({
      title: audioEnabled ? 'Muted' : 'Unmuted',
      description: `Microphone ${audioEnabled ? 'disabled' : 'enabled'}`,
    });
  };

  const toggleSpeaker = () => {
    setSpeakerEnabled(!speakerEnabled);
    toast({
      title: speakerEnabled ? 'Speaker Off' : 'Speaker On',
      description: `Audio output ${speakerEnabled ? 'disabled' : 'enabled'}`,
    });
  };

  const handleDisconnect = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    setConnected(false);
    onDisconnect();
    toast({
      title: 'Call Ended',
      description: `Call duration: ${formatDuration(callDuration)}`,
    });
  };


  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Voice Call
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? 'Connected' : 'Connecting...'}
            </Badge>
            <Badge variant="destructive">
              🔴 Recording
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Call Status Display */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="w-12 h-12 text-primary" />
          </div>
          
          <div>
            <p className="text-lg font-semibold">
              {participants.length > 0 ? 'In Call' : 'Waiting for participant...'}
            </p>
            <p className="text-sm text-muted-foreground">
              {connected ? formatDuration(callDuration) : 'Connecting...'}
            </p>
          </div>

          {/* Participants Count */}
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">{participants.length + 1} participant(s)</span>
          </div>

          {/* Connection Quality */}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getConnectionColor()}`} />
            <span className="text-xs text-muted-foreground capitalize">
              {connectionQuality} connection
            </span>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={audioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="w-14 h-14 rounded-full"
          >
            {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>

          <Button
            variant={speakerEnabled ? "default" : "secondary"}
            size="lg"
            onClick={toggleSpeaker}
            className="w-14 h-14 rounded-full"
          >
            {speakerEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </Button>

        </div>

        {/* End Call Button */}
        <div className="flex justify-center">
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDisconnect}
            className="w-16 h-16 rounded-full"
          >
            <PhoneOff className="w-8 h-8" />
          </Button>
        </div>

        {/* Session Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Room: {accessToken.roomName}</p>
          <p>ID: {accessToken.sessionId}</p>
          <p>Identity: {accessToken.identity}</p>
        </div>
      </CardContent>
    </Card>
  );
};