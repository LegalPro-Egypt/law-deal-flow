import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PromotionalPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
}

export const PromotionalPopup: React.FC<PromotionalPopupProps> = ({
  isOpen,
  onClose,
  onSignUp,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-transparent"
        onClick={onClose}
      />
      <div className="relative">
        <Card className="relative bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 shadow-2xl max-w-lg w-full">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1 rounded-full hover:bg-primary/10 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <CardContent className="p-8">
            <div className="text-center space-y-4 mb-6">
              <h2 className="text-2xl font-bold text-primary">
                Get Your First Legal Consultation FREE
              </h2>
              <p className="text-lg text-muted-foreground">
                Sign up now and get matched with a vetted lawyer for your first case at no cost
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-background/50 rounded-lg p-4 border">
                <h3 className="font-semibold text-primary mb-3">What You Get:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                    <span><strong>Free initial consultation</strong> (valued at $50+)</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                    <span>Matched with verified, specialized lawyers</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                    <span>Secure, encrypted communication</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                    <span>Payment protection on all services</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={onSignUp}
                size="lg" 
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Claim Free Consultation
              </Button>
              <Button 
                onClick={onClose}
                variant="outline" 
                size="lg"
                className="flex-1"
              >
                Maybe Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};