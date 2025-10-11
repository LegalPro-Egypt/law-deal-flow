import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useContracts } from "@/hooks/useContracts";
import { Loader2, Package } from "lucide-react";

interface DhlShipmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
}

export function DhlShipmentDialog({
  isOpen,
  onClose,
  contractId
}: DhlShipmentDialogProps) {
  const { toast } = useToast();
  const { updateContractStatus } = useContracts();
  const [courier, setCourier] = useState("");
  const [customCourier, setCustomCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!courier) {
      toast({
        title: "Error",
        description: "Please select a courier company",
        variant: "destructive"
      });
      return;
    }

    if (courier === "other" && !customCourier.trim()) {
      toast({
        title: "Error",
        description: "Please enter the courier name",
        variant: "destructive"
      });
      return;
    }

    if (!trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateContractStatus.mutateAsync({
        contractId,
        status: 'sent_for_signature',
        updates: {
          dhl_tracking_number: trackingNumber,
          courier_company: courier === "other" ? customCourier : courier,
          expected_delivery_date: expectedDate || null,
          shipment_notes: notes || null,
          sent_for_signature_at: new Date().toISOString()
        }
      });

      toast({
        title: "Success",
        description: "Shipment details recorded. Admin will confirm receipt."
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record shipment",
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
            Physical Signature Shipment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="courier">Courier *</Label>
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger id="courier">
                <SelectValue placeholder="Select courier..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="egypt-post">Egypt Post</SelectItem>
                <SelectItem value="egypt-express">Egypt Express (EGXPress)</SelectItem>
                <SelectItem value="bosta">Bosta</SelectItem>
                <SelectItem value="dhl">DHL Express (Egypt)</SelectItem>
                <SelectItem value="ups">UPS Egypt</SelectItem>
                <SelectItem value="fedex">FedEx Egypt</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {courier === "other" && (
            <div>
              <Label htmlFor="custom-courier">Courier Name *</Label>
              <Input
                id="custom-courier"
                value={customCourier}
                onChange={(e) => setCustomCourier(e.target.value)}
                placeholder="e.g., Aramex"
              />
            </div>
          )}

          <div>
            <Label htmlFor="tracking">Tracking Number *</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g., 1234567890"
            />
          </div>

          <div>
            <Label htmlFor="expected-date">Expected Delivery Date</Label>
            <Input
              id="expected-date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information about the shipment..."
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Next Steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Send the printed contract via your chosen courier</li>
              <li>Admin will confirm receipt</li>
              <li>You'll be notified once confirmed</li>
            </ol>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !courier || !trackingNumber.trim() || (courier === "other" && !customCourier.trim())}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                "Confirm Shipment"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}