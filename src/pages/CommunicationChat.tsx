import { useNavigate } from 'react-router-dom';
import { CommunicationInbox } from '@/components/CommunicationInbox';
import { useAuth } from '@/hooks/useAuth';
import { useClientData } from '@/hooks/useClientData';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const CommunicationChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cases, activeCase, loading } = useClientData(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
            <h1 className="text-lg font-semibold">Connect</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold">Connect</h1>
        </div>
      </div>

      {/* Fullscreen Communication Interface */}
      <div className="container mx-auto px-4 py-6">
        <CommunicationInbox
          cases={cases}
          userRole="client"
          caseId={activeCase?.id}
          caseTitle={activeCase?.title}
          caseStatus={activeCase?.status}
          consultationPaid={activeCase?.consultation_paid || false}
          paymentStatus={activeCase?.payment_status || 'pending'}
          lawyerAssigned={!!activeCase?.assigned_lawyer_id}
          loading={loading}
        />
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            All communication must remain on platform. External contact details will be automatically redacted.
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommunicationChat;
