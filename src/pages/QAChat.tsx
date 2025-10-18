import { useLocation, useNavigate } from 'react-router-dom';
import { LegalChatbot } from '@/components/LegalChatbot';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const QAChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initialMessage } = (location.state as { initialMessage?: string }) || {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/client')}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Ask Lexa</h1>
        </div>
      </div>

      {/* Fullscreen Chat Interface */}
      <div className="container mx-auto px-4 py-6 h-[calc(100vh-73px)]">
        <LegalChatbot 
          mode="qa" 
          userId={user?.id}
          initialMessage={initialMessage}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default QAChat;
