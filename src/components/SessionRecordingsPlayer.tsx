import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Download, Calendar, Clock, Video, Mic } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTwilioSession } from '@/hooks/useTwilioSession';

interface Recording {
  id: string;
  communication_session_id: string;
  twilio_recording_sid: string;
  recording_url?: string;
  signed_url?: string;
  duration_seconds?: number;
  file_size?: number;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  communication_sessions: {
    session_type: 'video' | 'voice' | 'chat';
    started_at?: string;
    cases: {
      case_number: string;
      title: string;
    };
  };
}

interface SessionRecordingsPlayerProps {
  caseId?: string;
  sessionId?: string;
}

export const SessionRecordingsPlayer: React.FC<SessionRecordingsPlayerProps> = ({
  caseId,
  sessionId
}) => {
  const { getRecordings } = useTwilioSession();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);

  useEffect(() => {
    loadRecordings();
  }, [caseId, sessionId]);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const data = await getRecordings(caseId, sessionId);
      setRecordings(data || []);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recordings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (recording: Recording) => {
    try {
      const url = recording.signed_url || recording.recording_url;
      if (!url) {
        toast({
          title: 'Download Error',
          description: 'Recording URL not available',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `recording-${recording.communication_sessions.cases.case_number}-${recording.created_at}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast({
        title: 'Download Started',
        description: 'Recording download has begun',
      });
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast({
        title: 'Download Error',
        description: 'Failed to download recording',
        variant: 'destructive',
      });
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'voice':
        return <Mic className="w-4 h-4" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading recordings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recordings available</p>
            <p className="text-sm">Recordings will appear here after sessions are completed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Session Recordings ({recordings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recordings.map((recording) => (
            <Card key={recording.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getSessionTypeIcon(recording.communication_sessions.session_type)}
                    <span className="font-medium capitalize">
                      {recording.communication_sessions.session_type} Session
                    </span>
                    <Badge variant={getStatusColor(recording.status)}>
                      {recording.status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">
                      {recording.communication_sessions.cases.case_number}: {recording.communication_sessions.cases.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(recording.communication_sessions.started_at || recording.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(recording.duration_seconds)}
                    </div>
                    <div>
                      {formatFileSize(recording.file_size)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {recording.status === 'completed' && (recording.recording_url || recording.signed_url) && (
                    <>
                      <video
                        controls
                        className="w-32 h-20 rounded"
                        src={recording.signed_url || recording.recording_url}
                        onPlay={() => setPlayingRecording(recording.id)}
                        onPause={() => setPlayingRecording(null)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(recording)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </>
                  )}
                  
                  {recording.status === 'processing' && (
                    <div className="text-sm text-muted-foreground px-3 py-1 rounded bg-muted">
                      Processing...
                    </div>
                  )}
                  
                  {recording.status === 'failed' && (
                    <div className="text-sm text-destructive px-3 py-1 rounded bg-destructive/10">
                      Failed
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};