import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, User, Clock, FileText, MessageSquare, Calendar, FolderOpen } from 'lucide-react';
import { MobileTab } from './MobileTabBar';

interface MobileWelcomeViewProps {
  caseData: any;
  onNavigate: (tab: MobileTab) => void;
  paymentRequired?: boolean;
  onPaymentClick?: () => void;
}

export const MobileWelcomeView: React.FC<MobileWelcomeViewProps> = ({
  caseData,
  onNavigate,
  paymentRequired,
  onPaymentClick,
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'closed': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const quickActions = [
    { id: 'milestones' as MobileTab, icon: Clock, label: 'Milestones', color: 'text-purple-500' },
    { id: 'connect' as MobileTab, icon: MessageSquare, label: 'Messages', color: 'text-blue-500' },
    { id: 'proposals' as MobileTab, icon: FileText, label: 'Proposals', color: 'text-green-500' },
    { id: 'calendar' as MobileTab, icon: Calendar, label: 'Calendar', color: 'text-orange-500' },
    { id: 'documents' as MobileTab, icon: FolderOpen, label: 'Documents', color: 'text-pink-500' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      {paymentRequired && (
        <Card className="mb-4 p-4 bg-destructive/10 border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">Payment Required</h3>
              <p className="text-sm text-destructive/80 mb-3">
                Please complete the payment to continue with your case.
              </p>
              <Button 
                onClick={onPaymentClick}
                size="sm" 
                variant="destructive"
                className="w-full"
              >
                Make Payment
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">{caseData?.title || 'Your Case'}</h1>
            <Badge className={getStatusColor(caseData?.status)}>
              {caseData?.status || 'Pending'}
            </Badge>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {caseData?.case_type && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{caseData.case_type}</span>
            </div>
          )}
          {caseData?.urgency && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Urgency: {caseData.urgency}</span>
            </div>
          )}
          {caseData?.assigned_lawyer_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Lawyer: {caseData.assigned_lawyer_name}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => onNavigate(action.id)}
              >
                <Icon className={`w-6 h-6 ${action.color}`} />
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
