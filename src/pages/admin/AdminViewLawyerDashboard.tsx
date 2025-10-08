import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Eye } from "lucide-react";
import LawyerDashboard from "@/pages/LawyerDashboard";

export default function AdminViewLawyerDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [lawyerInfo, setLawyerInfo] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (userId) {
      fetchLawyerInfo();
    }
  }, [userId]);

  const fetchLawyerInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      setLawyerInfo({
        name: data.first_name && data.last_name 
          ? `${data.first_name} ${data.last_name}` 
          : "Unknown Lawyer",
        email: data.email || "",
      });
    } catch (error) {
      console.error("Error fetching lawyer info:", error);
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <Eye className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-900">
            <strong>Admin View</strong> - Viewing as: {lawyerInfo?.name || "Loading..."} ({lawyerInfo?.email || ""})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/dashboards/lawyers")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lawyer List
          </Button>
        </AlertDescription>
      </Alert>

      {userId && <LawyerDashboard viewAsUserId={userId} />}
    </div>
  );
}
