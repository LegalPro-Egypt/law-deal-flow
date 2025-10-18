import * as React from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, Receipt, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuDropdownProps {
  children: React.ReactNode;
  activeCase: {
    status: string;
    consultation_paid: boolean;
    consultation_fee?: number;
    remaining_fee?: number;
    total_fee?: number;
    id: string;
    title: string;
  } | null;
  onPaymentHistoryOpen: () => void;
  onSignOut: () => void;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}

export const UserMenuDropdown = ({
  children,
  activeCase,
  onPaymentHistoryOpen,
  onSignOut,
  align = "end",
  side = "bottom",
}: UserMenuDropdownProps) => {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={align}
        side={side}
        className="bg-background border border-border shadow-lg z-50 w-48"
      >
        <DropdownMenuItem onClick={() => navigate('/help')}>
          <HelpCircle className="h-4 w-4 mr-2" />
          Contact Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onPaymentHistoryOpen}>
          <Receipt className="h-4 w-4 mr-2" />
          Payment History
        </DropdownMenuItem>
        {activeCase?.status === 'proposal_accepted' && !activeCase?.consultation_paid && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                navigate('/payment', {
                  state: {
                    paymentData: {
                      caseId: activeCase.id,
                      consultationFee: activeCase.consultation_fee || 0,
                      remainingFee: activeCase.remaining_fee || 0,
                      totalFee: activeCase.total_fee || 0,
                      lawyerName: 'Your Lawyer',
                      caseTitle: activeCase.title,
                      type: 'consultation'
                    }
                  }
                });
              }}
              className="text-primary font-medium"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Complete Payment
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
