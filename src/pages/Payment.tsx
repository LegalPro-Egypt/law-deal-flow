import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { CreditCard, Shield, Lock, ArrowLeft, Clock, User, Scale, CheckCircle2 } from 'lucide-react';

interface PaymentState {
  caseId: string;
  proposalId?: string;
  consultationFee: number;
  remainingFee: number;
  lawyerName: string;
  type: 'consultation' | 'remaining' | 'money_request';
  platformFeeAmount?: number;
  paymentProcessingFeeAmount?: number;
  clientProtectionFeeAmount?: number;
  totalAdditionalFees?: number;
  finalTotalFee?: number;
  // Money request specific
  moneyRequestId?: string;
  amount?: number;
  currency?: string;
  description?: string;
}

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentLanguage: language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentState | null>(null);
  
  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  useEffect(() => {
    // Get payment data from location state or redirect back
    if (location.state && location.state.paymentData) {
      setPaymentData(location.state.paymentData);
    } else {
      // Redirect to appropriate dashboard based on expected payment type
      navigate('/client');
    }
  }, [location.state, navigate]);

  const handlePayment = async () => {
    if (!paymentData) return;
    
    setLoading(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate 90% success rate
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        if (paymentData.type === 'money_request') {
          // Update money request status to paid
          const { error: moneyRequestError } = await supabase
            .from('money_requests')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              payment_intent_id: 'mock_payment_' + Date.now() // Mock payment ID
            })
            .eq('id', paymentData.moneyRequestId);

          if (moneyRequestError) throw moneyRequestError;

          // Create notification for lawyer
          const { data: caseData } = await supabase
            .from('cases')
            .select('assigned_lawyer_id, case_number, title')
            .eq('id', paymentData.caseId)
            .single();

          if (caseData?.assigned_lawyer_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: caseData.assigned_lawyer_id,
                title: 'Payment Received',
                message: `Payment of ${paymentData.amount} ${paymentData.currency} has been received for case ${caseData.case_number}.`,
                type: 'payment_completed',
                case_id: paymentData.caseId,
                action_required: false
              });
          }

          toast({
            title: "Payment Successful",
            description: `Your payment of ${paymentData.amount} ${paymentData.currency} has been processed successfully.`,
          });

          // Navigate back to client dashboard
          navigate('/client', { 
            state: { 
              message: `Payment of ${paymentData.amount} ${paymentData.currency} completed successfully` 
            } 
          });
        } else {
          // Existing consultation/remaining fee payment logic
          const { error: caseError } = await supabase
            .from('cases')
            .update({
              consultation_paid: true,
              payment_status: 'completed',
              payment_amount: paymentData.consultationFee,
              payment_date: new Date().toISOString(),
              status: 'consultation_paid'
            })
            .eq('id', paymentData.caseId);

          if (caseError) throw caseError;

          // Create notification for lawyer
          const { data: caseData } = await supabase
            .from('cases')
            .select('assigned_lawyer_id, case_number, title')
            .eq('id', paymentData.caseId)
            .single();

          if (caseData?.assigned_lawyer_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: caseData.assigned_lawyer_id,
                title: language === 'ar' ? 'تم دفع رسوم الاستشارة' : 'Consultation Fee Paid',
                message: language === 'ar' 
                  ? `تم دفع رسوم الاستشارة للقضية ${caseData.case_number}. يمكنك الآن بدء العمل مع العميل.`
                  : `Consultation fee has been paid for case ${caseData.case_number}. You can now start working with the client.`,
                type: 'payment_completed',
                case_id: paymentData.caseId,
                action_required: false
              });
          }

          toast({
            title: t('payment.success'),
            description: t('payment.successDescription'),
          });

          navigate('/client', { 
            state: { 
              message: "Payment completed successfully" 
            } 
          });
        }
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: language === 'ar' ? 'فشل في الدفع' : 'Payment Failed',
        description: language === 'ar' 
          ? 'حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while processing payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getPaymentAmount = () => {
    if (paymentData.type === 'money_request') {
      return paymentData.amount || 0;
    }
    return paymentData.consultationFee;
  };

  const getCurrency = () => {
    return paymentData.currency || 'USD';
  };

  const getPaymentTitle = () => {
    if (paymentData.type === 'money_request') {
      return 'Payment Request';
    }
    return paymentData.type === 'consultation' ? 'Consultation Fee' : 'Remaining Fee';
  };

  const formatCurrency = (amount: number) => {
    if (paymentData?.type === 'money_request') {
      const formatters = {
        'USD': '$',
        'EUR': '€',
        'EGP': 'E£',
        'GBP': '£',
        'CAD': 'C$'
      };
      const currency = getCurrency();
      return `${formatters[currency as keyof typeof formatters] || currency} ${amount.toLocaleString()}`;
    }
    
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  return (
    <div className={`min-h-screen bg-muted/50 ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/client')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'ar' ? 'العودة إلى لوحة التحكم' : 'Back to Dashboard'}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Payment Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {language === 'ar' ? 'معلومات الدفع' : 'Payment Information'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'أدخل معلومات بطاقتك الائتمانية لإكمال الدفع'
                    : 'Enter your payment details to complete the transaction'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment Method Selection */}
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">
                        {language === 'ar' ? 'بطاقة ائتمانية' : 'Credit Card'}
                      </SelectItem>
                      <SelectItem value="debit_card">
                        {language === 'ar' ? 'بطاقة خصم' : 'Debit Card'}
                      </SelectItem>
                      <SelectItem value="paypal" disabled>
                        PayPal ({language === 'ar' ? 'قريباً' : 'Coming Soon'})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Card Details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardName">
                      {language === 'ar' ? 'الاسم على البطاقة' : 'Cardholder Name'}
                    </Label>
                    <Input
                      id="cardName"
                      placeholder={language === 'ar' ? 'أحمد محمد' : 'John Doe'}
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">
                      {language === 'ar' ? 'رقم البطاقة' : 'Card Number'}
                    </Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={19}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">
                        {language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                      </Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-success/20 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <h4 className="font-medium text-success mb-1">
                      {language === 'ar' ? 'دفع آمن' : 'Secure Payment'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? 'جميع المعاملات محمية بتشفير SSL 256-بت ولن يتم حفظ معلومات بطاقتك'
                        : 'All transactions are protected with 256-bit SSL encryption and your card details are not stored'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {getPaymentTitle()}
                </CardTitle>
                <CardDescription>
                  {paymentData.type === 'money_request' 
                    ? paymentData.description || 'Payment requested by your lawyer'
                    : language === 'ar' ? 'ملخص الطلب' : 'Order Summary'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Case Info */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Scale className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">{language === 'ar' ? 'استشارة قانونية' : 'Legal Consultation'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'استشارة قانونية' : 'Legal Consultation'}
                      </p>
                    </div>
                  </div>
                  
                  {paymentData.lawyerName && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm">
                          {language === 'ar' ? 'المحامي:' : 'Lawyer:'} {paymentData.lawyerName}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'رسوم الاستشارة الأولية' : 'Initial Consultation Fee'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Fee Breakdown */}
                <div className="space-y-2">
                  {paymentData.type === 'consultation' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'رسوم الاستشارة' : 'Consultation Fee'}</span>
                        <span>{formatCurrency(paymentData.consultationFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{language === 'ar' ? 'رسوم المنصة (6%)' : 'Platform Fee (6%)'}</span>
                        <span className="text-sm">{formatCurrency(paymentData.consultationFee * 0.06)}</span>
                      </div>
                    </>
                  ) : paymentData.type === 'remaining' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'الرسوم المتبقية' : 'Remaining Fee'}</span>
                        <span>{formatCurrency(paymentData.remainingFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{language === 'ar' ? 'رسوم المنصة (6%)' : 'Platform Fee (6%)'}</span>
                        <span className="text-sm">{formatCurrency(paymentData.remainingFee * 0.06)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'المبلغ' : 'Amount'}</span>
                      <span>{formatCurrency(paymentData.amount || 0)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-semibold">
                  <span>{language === 'ar' ? 'المجموع' : 'Total'}</span>
                  <span>
                    {paymentData.type === 'money_request'
                      ? formatCurrency(getPaymentAmount())
                      : paymentData.type === 'consultation' 
                        ? formatCurrency(paymentData.consultationFee * 1.06)
                        : formatCurrency(paymentData.remainingFee * 1.06)
                    }
                  </span>
                </div>

                {/* Payment Button */}
                <Button 
                  onClick={handlePayment} 
                  disabled={loading || !cardNumber || !expiryDate || !cvv || !cardName}
                  className="w-full mt-6"
                  size="lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      {language === 'ar' ? 'دفع آمن' : 'Pay Securely'} {
                        paymentData.type === 'money_request'
                          ? formatCurrency(getPaymentAmount())
                          : paymentData.type === 'consultation' 
                            ? formatCurrency(paymentData.consultationFee * 1.06)
                            : formatCurrency(paymentData.remainingFee * 1.06)
                      }
                    </div>
                  )}
                </Button>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                  <Badge variant="secondary" className="justify-center py-2">
                    <Shield className="w-3 h-3 mr-1" />
                    SSL
                  </Badge>
                  <Badge variant="secondary" className="justify-center py-2">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {language === 'ar' ? 'آمن' : 'Secure'}
                  </Badge>
                  <Badge variant="secondary" className="justify-center py-2">
                    <Lock className="w-3 h-3 mr-1" />
                    {language === 'ar' ? 'محمي' : 'Protected'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;