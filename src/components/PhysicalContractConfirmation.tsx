import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useContracts } from "@/hooks/useContracts";
import { Package, CheckCircle } from "lucide-react";

interface PhysicalContractConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  onConfirmed?: () => void;
}

export function PhysicalContractConfirmation({
  isOpen,
  onClose,
  contractId,
  onConfirmed
}: PhysicalContractConfirmationProps) {
  const { toast } = useToast();
  const { updateContractStatus } = useContracts();
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!receivedBy.trim()) {
      toast({
        title: "Error",
        description: "Please enter who received the contract",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateContractStatus.mutateAsync({
        contractId,
        status: 'physically_signed',
        updates: {
          physically_received_at: new Date().toISOString(),
          received_by: receivedBy,
          shipment_notes: notes || null
        }
      });

      toast({
        title: "Success",
        description: "Physical contract received and confirmed"
      });

      onConfirmed?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm receipt",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Confirm Physical Contract Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Confirm Receipt</p>
                <p className="text-muted-foreground">
                  Please confirm that the physically signed contract has been received at the office.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="received-by">Received By *</Label>
            <Input
              id="received-by"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Name of person who received the contract"
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the received contract..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || !receivedBy.trim()}
            >
              {isSubmitting ? "Confirming..." : "Confirm Receipt"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
