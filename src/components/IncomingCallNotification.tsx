import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Video, Phone, MessageCircle, PhoneCall, PhoneOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { TwilioSession } from '@/hooks/useTwilioSession';

interface IncomingCallNotificationProps {
  session: TwilioSession;
  onAccept: (session: TwilioSession) => void;
  onDecline: (session: TwilioSession) => void;
}

export const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  session,
  onAccept,
  onDecline
}) => {
  const { user } = useAuth();
  const [clientName, setClientName] = useState<string>('Unknown Client');
  const [caseTitle, setCaseTitle] = useState<string>('');
  const [initiatorName, setInitiatorName] = useState<string>('');
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        // Fetch case and client details
        const { data: caseData } = await supabase
          .from('cases')
          .select(`
            title,
            client_name,
            case_number
          `)
          .eq('id', session.case_id)
          .single();

        if (caseData) {
          setCaseTitle(caseData.title || caseData.case_number);
          const fallbackClientName = caseData.client_name || 'Client';
          setClientName(fallbackClientName);

          // Determine initiator with robust fallback when initiated_by is null
          const currentUserId = user?.id;
          const inferredInitiatorId = session.initiated_by ?? (
            currentUserId === session.lawyer_id
              ? session.client_id
              : currentUserId === session.client_id
                ? session.lawyer_id || session.client_id
                : session.client_id
          );

          if (inferredInitiatorId === session.client_id) {
            // Initiator is the client
            setInitiatorName(fallbackClientName);
          } else if (session.lawyer_id) {
            // Initiator is the lawyer; fetch lawyer's name
            const { data: lawyerProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', session.lawyer_id)
              .single();
            const lawyerName = lawyerProfile
              ? `${lawyerProfile.first_name || ''} ${lawyerProfile.last_name || ''}`.trim() || 'Lawyer'
              : 'Lawyer';
            setInitiatorName(lawyerName);
          } else {
            setInitiatorName('Lawyer');
          }
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
      }
    };

    fetchSessionDetails();
  }, [session, user]);

  const handleAccept = async () => {
    if (isResponding) return;
    
    setIsResponding(true);
    try {
      // Update session status to active
      const { error } = await supabase
        .from('communication_sessions')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: 'Call Accepted',
        description: 'Joining the communication session...',
      });

      onAccept(session);
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept the call',
        variant: 'destructive',
      });
    } finally {
      setIsResponding(false);
    }
  };

  const handleDecline = async () => {
    if (isResponding) return;
    
    setIsResponding(true);
    try {
      // Update session status to failed/declined
      const { error } = await supabase
        .from('communication_sessions')
        .update({ 
          status: 'failed',
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: 'Call Declined',
        description: 'The communication request has been declined',
      });

      onDecline(session);
    } catch (error) {
      console.error('Error declining call:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline the call',
        variant: 'destructive',
      });
    } finally {
      setIsResponding(false);
    }
  };

  const getSessionIcon = () => {
    switch (session.session_type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'voice': return <Phone className="w-5 h-5" />;
      case 'chat': return <MessageCircle className="w-5 h-5" />;
      default: return <PhoneCall className="w-5 h-5" />;
    }
  };

  const getSessionTypeText = () => {
    switch (session.session_type) {
      case 'video': return 'Video Call';
      case 'voice': return 'Voice Call';
      case 'chat': return 'Chat Session';
      default: return 'Communication Request';
    }
  };

  return (
    <Card className="border-primary bg-primary/5 animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="ring-2 ring-primary">
              <AvatarFallback className="bg-primary/10">
                {(initiatorName || clientName).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getSessionIcon()}
                <h4 className="font-semibold">{getSessionTypeText()}</h4>
                <Badge variant="default" className="animate-bounce">
                  Incoming
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                From: {initiatorName || clientName}
              </p>
              <p className="text-xs text-muted-foreground">
                Case: {caseTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAccept}
              disabled={isResponding}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <PhoneCall className="w-4 h-4 mr-2" />
              {isResponding ? 'Accepting...' : 'Accept'}
            </Button>
            
            <Button
              onClick={handleDecline}
              disabled={isResponding}
              variant="destructive"
              size="sm"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              {isResponding ? 'Declining...' : 'Decline'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};