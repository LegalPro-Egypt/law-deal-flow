import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, Download, Users, Signal, Volume2, VolumeX } from 'lucide-react';
import { TwilioSession } from '@/hooks/useTwilioSession';

interface TwilioSessionControlsProps {
  session: TwilioSession;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onEndSession: () => void;
  connectionQuality?: 'excellent' | 'good' | 'poor';
  participantCount?: number;
  duration?: number;
}

export const TwilioSessionControls: React.FC<TwilioSessionControlsProps> = ({
  session,
  isRecording,
  onStartRecording,
  onStopRecording,
  onEndSession,
  connectionQuality = 'excellent',
  participantCount = 1,
  duration = 0
}) => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionProgress = () => {
    switch (connectionQuality) {
      case 'excellent': return 100;
      case 'good': return 60;
      case 'poor': return 30;
      default: return 0;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Session Controls</span>
          <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
            {session.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Session Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Duration</p>
            <p className="font-mono text-lg">{formatDuration(duration)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Participants</p>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span className="font-medium">{participantCount}</span>
            </div>
          </div>
        </div>

        {/* Connection Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Connection Quality</span>
            <span className={`capitalize ${getConnectionColor()}`}>
              {connectionQuality}
            </span>
          </div>
          <Progress value={getConnectionProgress()} className="h-2" />
        </div>

        {/* Recording Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Recording</span>
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                🔴 Recording
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isRecording ? (
              <Button
                onClick={onStartRecording}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Play className="w-3 h-3" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={onStopRecording}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
              >
                <Square className="w-3 h-3" />
                Stop Recording
              </Button>
            )}
          </div>
        </div>

        {/* Session Type Info */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Session Type</span>
            <span className="capitalize font-medium">{session.session_type}</span>
          </div>
          {session.room_name && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Room</span>
              <span className="font-mono text-xs">{session.room_name}</span>
            </div>
          )}
        </div>

        {/* End Session */}
        <Button
          onClick={onEndSession}
          variant="destructive"
          className="w-full"
        >
          End Session
        </Button>

        {/* Session Warnings */}
        {connectionQuality === 'poor' && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            ⚠️ Poor connection quality detected. Consider checking your internet connection.
          </div>
        )}
        
        {participantCount === 1 && session.status === 'active' && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            ℹ️ Waiting for other participants to join the session.
          </div>
        )}
      </CardContent>
    </Card>
  );
};