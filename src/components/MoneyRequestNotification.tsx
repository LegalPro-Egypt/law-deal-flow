import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useMoneyRequests, MoneyRequest } from '@/hooks/useMoneyRequests';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Clock, CheckCircle, User, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface MoneyRequestNotificationProps {
  moneyRequestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MoneyRequestNotification: React.FC<MoneyRequestNotificationProps> = ({
  moneyRequestId,
  open,
  onOpenChange
}) => {
  const navigate = useNavigate();
  const { moneyRequests, updateMoneyRequestStatus } = useMoneyRequests();
  const [processingPayment, setProcessingPayment] = useState(false);

  const moneyRequest = moneyRequests.find(mr => mr.id === moneyRequestId);

  if (!moneyRequest) {
    return null;
  }

  const handlePayment = async () => {
    setProcessingPayment(true);
    
    // Navigate to payment page with money request data
    navigate('/payment', {
      state: {
        paymentData: {
          type: 'money_request',
          moneyRequestId: moneyRequest.id,
          caseId: moneyRequest.case_id,
          amount: moneyRequest.amount,
          currency: moneyRequest.currency,
          description: moneyRequest.description,
          lawyerName: moneyRequest.lawyer?.first_name && moneyRequest.lawyer?.last_name 
            ? `${moneyRequest.lawyer.first_name} ${moneyRequest.lawyer.last_name}`
            : moneyRequest.lawyer?.email || 'Unknown Lawyer'
        }
      }
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatters = {
      'USD': '$',
      'EUR': '€',
      'EGP': 'E£',
      'GBP': '£',
      'CAD': 'C$'
    };
    
    return `${formatters[currency as keyof typeof formatters] || currency} ${amount.toLocaleString()}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Request Details
          </DialogTitle>
        </DialogHeader>
        
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {formatCurrency(moneyRequest.amount, moneyRequest.currency)}
              </CardTitle>
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 ${getStatusColor(moneyRequest.status)}`}
              >
                {getStatusIcon(moneyRequest.status)}
                {moneyRequest.status === 'paid' ? 'Paid' : 'Payment Pending'}
              </Badge>
            </div>
            <CardDescription className="text-base">
              {moneyRequest.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Lawyer
                </div>
                <p className="text-sm">
                  {moneyRequest.lawyer?.first_name && moneyRequest.lawyer?.last_name 
                    ? `${moneyRequest.lawyer.first_name} ${moneyRequest.lawyer.last_name}`
                    : moneyRequest.lawyer?.email || 'Unknown Lawyer'
                  }
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Case
                </div>
                <p className="text-sm">
                  {moneyRequest.case?.case_number} - {moneyRequest.case?.title}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Request Date
              </div>
              <p className="text-sm">
                {format(new Date(moneyRequest.created_at), 'PPp')}
              </p>
            </div>

            {moneyRequest.paid_at && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  Payment Date
                </div>
                <p className="text-sm">
                  {format(new Date(moneyRequest.paid_at), 'PPp')}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              
              {moneyRequest.status === 'pending' && (
                <Button 
                  onClick={handlePayment}
                  disabled={processingPayment}
                  className="bg-primary hover:bg-primary/90"
                >
                  {processingPayment ? 'Processing...' : 'Payment Pending'}
                </Button>
              )}
              
              {moneyRequest.status === 'paid' && (
                <Button 
                  disabled
                  className="bg-green-600 hover:bg-green-600 cursor-not-allowed"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Paid
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};