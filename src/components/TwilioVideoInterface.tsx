import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TwilioAccessToken } from '@/hooks/useTwilioSession';
import * as TwilioVideo from 'twilio-video';
import { supabase } from '@/integrations/supabase/client';

interface TwilioVideoInterfaceProps {
  accessToken: TwilioAccessToken;
  onDisconnect: () => void;
}

export const TwilioVideoInterface: React.FC<TwilioVideoInterfaceProps> = ({
  accessToken,
  onDisconnect
}) => {
  const [room, setRoom] = useState<TwilioVideo.Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<TwilioVideo.RemoteParticipant[]>([]);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    const connectToRoom = async () => {
      try {
        console.log('Connecting to Twilio room:', accessToken.roomName);
        
        const twilioRoom = await TwilioVideo.connect(accessToken.accessToken, {
          name: accessToken.roomName,
          audio: true,
          video: { width: 640, height: 480 },
          networkQuality: { local: 1, remote: 1 },
          dominantSpeaker: true
        });

        console.log('Successfully connected to Twilio room:', twilioRoom.name);
        setRoom(twilioRoom);
        setConnected(true);

        // Update session status to active
        await supabase
          .from('communication_sessions')
          .update({ 
            status: 'active',
            started_at: new Date().toISOString()
          })
          .eq('id', accessToken.sessionId);

        if (localVideoRef.current) {
          // Clear any existing attached elements
          const existing = localVideoRef.current.querySelectorAll('video, audio');
          existing.forEach(el => el.remove());

          twilioRoom.localParticipant.videoTracks.forEach(publication => {
            if (publication.track) {
              localVideoRef.current?.appendChild(publication.track.attach());
            }
          });
        }

        // Handle existing participants
        twilioRoom.participants.forEach(participant => {
          console.log('Existing participant:', participant.identity);
          handleParticipantConnected(participant);
        });

        // Listen for new participants
        twilioRoom.on('participantConnected', handleParticipantConnected);
        twilioRoom.on('participantDisconnected', handleParticipantDisconnected);

        toast({
          title: 'Connected',
          description: `Joined video session: ${accessToken.roomName}`,
        });

      } catch (error) {
        console.error('Error connecting to room:', error);
        
        // Update session status to failed
        await supabase
          .from('communication_sessions')
          .update({ 
            status: 'failed',
            ended_at: new Date().toISOString()
          })
          .eq('id', accessToken.sessionId);

        const err: any = error;
        console.error('Error connecting to room:', err?.code, err?.message || err);

        toast({
          title: 'Connection Error',
          description: err?.message ? `Failed to join: ${err.message}` : 'Failed to join video session',
          variant: 'destructive',
        });
      }
    };

    const handleParticipantConnected = (participant: TwilioVideo.RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      setParticipants(prev => [...prev, participant]);

      // Attach existing tracks
      participant.tracks.forEach(publication => {
        if (publication.isSubscribed && publication.track) {
          const track = publication.track;
          if (track.kind === 'video' || track.kind === 'audio') {
            attachTrack(track as TwilioVideo.RemoteVideoTrack | TwilioVideo.RemoteAudioTrack, participant.sid);
          }
        }
      });

      // Handle new tracks
      participant.on('trackSubscribed', (track) => {
        if (track.kind === 'video' || track.kind === 'audio') {
          attachTrack(track as TwilioVideo.RemoteVideoTrack | TwilioVideo.RemoteAudioTrack, participant.sid);
        }
      });

      participant.on('trackUnsubscribed', (track) => {
        if (track.kind === 'video' || track.kind === 'audio') {
          (track as TwilioVideo.RemoteVideoTrack | TwilioVideo.RemoteAudioTrack).detach().forEach(element => element.remove());
        }
      });
    };

    const handleParticipantDisconnected = (participant: TwilioVideo.RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
      
      // Remove video element
      const videoElement = remoteVideosRef.current.get(participant.sid);
      if (videoElement) {
        videoElement.remove();
        remoteVideosRef.current.delete(participant.sid);
      }
    };

    const attachTrack = (track: TwilioVideo.RemoteVideoTrack | TwilioVideo.RemoteAudioTrack, participantSid: string) => {
      if (track.kind === 'video') {
        const remoteVideoContainer = document.getElementById('remote-videos');
        if (remoteVideoContainer) {
          const videoElement = (track as TwilioVideo.RemoteVideoTrack).attach();
          videoElement.classList.add('w-full', 'h-full', 'object-cover');
          remoteVideoContainer.appendChild(videoElement);
          remoteVideosRef.current.set(participantSid, videoElement as HTMLVideoElement);
        }
      } else if (track.kind === 'audio') {
        (track as TwilioVideo.RemoteAudioTrack).attach();
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
  }, [accessToken]);

  const toggleVideo = () => {
    if (room) {
      room.localParticipant.videoTracks.forEach(publication => {
        if (publication.track) {
          if (videoEnabled) {
            publication.track.disable();
          } else {
            publication.track.enable();
          }
        }
      });
      setVideoEnabled(!videoEnabled);
      toast({
        title: videoEnabled ? 'Video Off' : 'Video On',
        description: `Camera ${videoEnabled ? 'disabled' : 'enabled'}`,
      });
    }
  };

  const toggleAudio = () => {
    if (room) {
      room.localParticipant.audioTracks.forEach(publication => {
        if (publication.track) {
          if (audioEnabled) {
            publication.track.disable();
          } else {
            publication.track.enable();
          }
        }
      });
      setAudioEnabled(!audioEnabled);
      toast({
        title: audioEnabled ? 'Muted' : 'Unmuted',
        description: `Microphone ${audioEnabled ? 'disabled' : 'enabled'}`,
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing && room) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];
        
        // Replace camera track with screen track
        room.localParticipant.videoTracks.forEach(publication => {
          publication.track?.stop();
          publication.unpublish();
        });

        await room.localParticipant.publishTrack(screenTrack);
        
        // Update local video
        if (localVideoRef.current) {
          const existingTracks = localVideoRef.current.querySelectorAll('video');
          existingTracks.forEach(track => track.remove());
          const videoElement = document.createElement('video');
          videoElement.srcObject = stream;
          videoElement.autoplay = true;
          videoElement.muted = true;
          videoElement.className = 'w-full h-full object-cover';
          localVideoRef.current.appendChild(videoElement);
        }

        setScreenSharing(true);
        toast({
          title: 'Screen Share Started',
          description: 'Sharing your screen with participants',
        });

        // Handle when screen sharing stops
        screenTrack.onended = () => toggleScreenShare();
      } else if (screenSharing && room) {
        // Stop screen sharing and return to camera
        room.localParticipant.videoTracks.forEach(publication => {
          publication.track?.stop();
          publication.unpublish();
        });

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const cameraTrack = stream.getVideoTracks()[0];
        await room.localParticipant.publishTrack(cameraTrack);

        // Update local video
        if (localVideoRef.current) {
          const existingTracks = localVideoRef.current.querySelectorAll('video');
          existingTracks.forEach(track => track.remove());
          const videoElement = document.createElement('video');
          videoElement.srcObject = stream;
          videoElement.autoplay = true;
          videoElement.muted = true;
          videoElement.className = 'w-full h-full object-cover';
          localVideoRef.current.appendChild(videoElement);
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
            <div
              ref={localVideoRef}
              className="w-full h-full"
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
          <div id="remote-videos" className="relative bg-muted rounded-lg overflow-hidden">
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