import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMoneyRequests } from '@/hooks/useMoneyRequests';
import { DollarSign, Euro, Banknote } from 'lucide-react';

interface Case {
  id: string;
  case_number: string;
  title: string;
}

interface MoneyRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cases: Case[];
}

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', icon: DollarSign },
  { code: 'EUR', name: 'Euro', symbol: '€', icon: Euro },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', icon: Banknote },
  { code: 'GBP', name: 'British Pound', symbol: '£', icon: Banknote },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', icon: DollarSign },
];

export const MoneyRequestDialog: React.FC<MoneyRequestDialogProps> = ({
  open,
  onOpenChange,
  cases
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const { createMoneyRequest } = useMoneyRequests();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCaseId || !amount || !description) {
      return;
    }

    setLoading(true);
    
    const success = await createMoneyRequest(
      selectedCaseId,
      parseFloat(amount),
      currency,
      description
    );

    if (success) {
      setSelectedCaseId('');
      setAmount('');
      setCurrency('USD');
      setDescription('');
      onOpenChange(false);
    }
    
    setLoading(false);
  };

  const selectedCurrency = currencies.find(c => c.code === currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Request Money from Client
          </DialogTitle>
          <DialogDescription>
            Send a payment request to your client for additional fees or expenses.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="case">Select Case</Label>
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId} required>
              <SelectTrigger>
                <SelectValue placeholder="Choose a case" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((case_) => (
                  <SelectItem key={case_.id} value={case_.id}>
                    {case_.case_number} - {case_.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                  required
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  {selectedCurrency?.symbol}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => {
                    const IconComponent = curr.icon;
                    return (
                      <SelectItem key={curr.code} value={curr.code}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{curr.code} - {curr.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this payment is for..."
              className="min-h-[80px]"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedCaseId || !amount || !description}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};