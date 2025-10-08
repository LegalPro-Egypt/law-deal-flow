import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Edit } from 'lucide-react';
import { LawyerContractRevisionDialog } from './LawyerContractRevisionDialog';
import { Contract } from '@/hooks/useContracts';
import { Skeleton } from '@/components/ui/skeleton';

export const LawyerContractsNeedingChanges = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const { toast } = useToast();

  const fetchContractsNeedingChanges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('status', 'changes_requested')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractsNeedingChanges();
  }, []);

  const handleReviseContract = (contract: Contract) => {
    setSelectedContract(contract);
    setShowRevisionDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Contracts Needing Changes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Contracts Needing Changes
            <Badge variant="destructive">{contracts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contracts.map((contract) => (
            <Card key={contract.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="destructive">Changes Requested</Badge>
                      <span className="text-sm text-muted-foreground truncate">
                        Case ID: {contract.case_id.slice(0, 8)}...
                      </span>
                    </div>
                    {contract.admin_notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {contract.admin_notes}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleReviseContract(contract)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Revise
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <LawyerContractRevisionDialog
        isOpen={showRevisionDialog}
        onClose={() => setShowRevisionDialog(false)}
        contract={selectedContract}
        onUpdate={fetchContractsNeedingChanges}
      />
    </>
  );
};
