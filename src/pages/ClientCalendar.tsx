import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaseCalendar } from "@/components/CaseCalendar";
import { useClientData } from "@/hooks/useClientData";
import { useAuth } from "@/hooks/useAuth";

export default function ClientCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCase } = useClientData(user?.id);

  if (!activeCase) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/client')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No active case found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/client')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Calendar & Appointments</h1>
            <p className="text-muted-foreground">View and manage your scheduled meetings</p>
          </div>
        </div>

        {/* Calendar Component */}
        <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6">
          <CaseCalendar
            caseId={activeCase.id}
            isLawyer={false}
            clientId={user?.id}
            lawyerId={activeCase.assigned_lawyer_id}
          />
        </div>
      </div>
    </div>
  );
}
