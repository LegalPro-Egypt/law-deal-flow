import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer, PenTool, Package } from "lucide-react";

interface ContractNextStepsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: 'en' | 'ar';
}

export function ContractNextStepsDialog({
  isOpen,
  onClose,
  currentLanguage
}: ContractNextStepsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            {currentLanguage === 'ar' ? 'تم قبول العقد!' : 'Contract Accepted!'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            {currentLanguage === 'ar' 
              ? 'تم تنزيل العقد بنجاح. يرجى اتباع هذه الخطوات لإكمال العملية:'
              : 'Your contract has been downloaded successfully. Please follow these steps to complete the process:'}
          </p>

          <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Printer className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {currentLanguage === 'ar' ? '١. اطبع العقد' : '1. Print the Contract'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentLanguage === 'ar' 
                    ? 'قم بطباعة جميع صفحات العقد'
                    : 'Print all pages of the downloaded contract'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <PenTool className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {currentLanguage === 'ar' ? '٢. وقع العقد' : '2. Sign the Contract'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentLanguage === 'ar' 
                    ? 'وقع في جميع الأماكن المحددة'
                    : 'Sign in all designated areas'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {currentLanguage === 'ar' ? '٣. أرسل عبر DHL' : '3. Ship via DHL'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentLanguage === 'ar' 
                    ? 'أرسل العقد الموقع إلى مكتبنا وقدم رقم التتبع'
                    : 'Mail the signed contract to our office and provide the tracking number'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              {currentLanguage === 'ar' ? '⚠️ مهم:' : '⚠️ Important:'}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {currentLanguage === 'ar' 
                ? 'سيصبح العقد نشطًا رسميًا فقط بعد استلام العقد الموقع فعليًا وتأكيده من قبل مكتبنا.'
                : 'The contract will only become officially active after the physically signed copy is received and confirmed by our office.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            {currentLanguage === 'ar' ? 'فهمت' : 'Got It'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
