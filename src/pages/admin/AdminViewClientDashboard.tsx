import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Eye } from "lucide-react";
import ClientDashboard from "@/pages/ClientDashboard";

export default function AdminViewClientDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (userId) {
      fetchClientInfo();
    }
  }, [userId]);

  const fetchClientInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      setClientInfo({
        name: data.first_name && data.last_name 
          ? `${data.first_name} ${data.last_name}` 
          : "Unknown Client",
        email: data.email || "",
      });
    } catch (error) {
      console.error("Error fetching client info:", error);
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <Eye className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-900">
            <strong>Admin View</strong> - Viewing as: {clientInfo?.name || "Loading..."} ({clientInfo?.email || ""})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/dashboards/clients")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client List
          </Button>
        </AlertDescription>
      </Alert>

      {userId && <ClientDashboard viewAsUserId={userId} />}
    </div>
  );
}
