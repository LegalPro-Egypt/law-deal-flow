import { Home, Plus, AlignJustify } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { UserMenuDropdown } from "./UserMenuDropdown";

interface BottomNavProps {
  active?: "home" | "profile";
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
}

export const BottomNav = ({ 
  active = "home", 
  activeCase,
  onPaymentHistoryOpen,
  onSignOut
}: BottomNavProps) => {
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)] rounded-t-2xl px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+10px)] md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-between relative">
        {/* Home */}
        <button
          onClick={() => navigate("/client")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 min-h-[44px] flex-1 text-xs font-medium transition-colors",
            active === "home" ? "text-primary" : "text-muted-foreground"
          )}
          aria-label="Home"
          aria-current={active === "home" ? "page" : undefined}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </button>

        {/* Center FAB - New Case */}
        <button
          onClick={() => navigate("/intake")}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-5 w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-primary hover:bg-primary-hover active:scale-95 transition-all"
          aria-label="Start new case"
        >
          <Plus className="h-7 w-7 text-primary-foreground" />
        </button>

        {/* Spacer for FAB */}
        <div className="flex-1" />

        {/* Menu */}
        <UserMenuDropdown
          activeCase={activeCase}
          onPaymentHistoryOpen={onPaymentHistoryOpen}
          onSignOut={onSignOut}
          align="end"
          side="top"
        >
          <button
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-h-[44px] flex-1 text-xs font-medium transition-colors",
              active === "profile" ? "text-primary" : "text-muted-foreground"
            )}
            aria-label="Menu"
          >
            <AlignJustify className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </UserMenuDropdown>
      </div>
    </nav>
  );
};
