import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users } from 'lucide-react';
import { DirectChatInterface } from './DirectChatInterface';
import { NotificationBadge } from './ui/notification-badge';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useLanguage } from '@/hooks/useLanguage';

interface CommunicationLauncherProps {
  caseId: string;
  caseTitle: string;
  lawyerAssigned?: boolean;
  communicationModes?: {
    text: boolean;
    voice: boolean;
    video: boolean;
  };
}

export const CommunicationLauncher: React.FC<CommunicationLauncherProps> = ({
  caseId,
  caseTitle,
  lawyerAssigned = false,
}) => {
  const { isRTL } = useLanguage();
  const { unreadCounts } = useChatNotifications();
  const [showDirectChat, setShowDirectChat] = useState(false);

  // Persist chat modal open state
  const storageKey = `directChatOpen:${caseId}`;
  
  useEffect(() => {
    const wasOpen = sessionStorage.getItem(storageKey) === '1';
    if (wasOpen) {
      setShowDirectChat(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (showDirectChat) {
      sessionStorage.setItem(storageKey, '1');
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }, [showDirectChat, storageKey]);

  const caseUnreadCount = unreadCounts[caseId] || 0;

  // Show direct chat interface if open
  if (showDirectChat) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-2xl">
          <DirectChatInterface
            caseId={caseId}
            caseTitle={caseTitle}
            onClose={() => setShowDirectChat(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isRTL() ? 'rtl-dir' : ''}`}>
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse justify-end' : ''}`}>
            <MessageCircle className="w-5 h-5" />
            Communication
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-4 ${isRTL() ? 'text-right' : ''}`}>
          {!lawyerAssigned ? (
            <div className={`text-center p-4 bg-muted rounded-lg ${isRTL() ? 'text-right' : ''}`}>
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Waiting for lawyer assignment to enable communication
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Button
                  onClick={() => setShowDirectChat(true)}
                  className={`w-full flex items-center justify-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}
                  size="lg"
                >
                  <MessageCircle className="w-5 h-5" />
                  Open Direct Chat
                </Button>
                {caseUnreadCount > 0 && (
                  <div className="absolute -top-2 -right-2">
                    <NotificationBadge count={caseUnreadCount} />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Send messages directly to your lawyer
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
