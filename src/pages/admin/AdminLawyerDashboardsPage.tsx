import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface LawyerData {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  verification_status: string | null;
  created_at: string;
  active_cases: number;
}

export default function AdminLawyerDashboardsPage() {
  const navigate = useNavigate();
  const [lawyers, setLawyers] = useState<LawyerData[]>([]);
  const [filteredLawyers, setFilteredLawyers] = useState<LawyerData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLawyers();
  }, []);

  useEffect(() => {
    filterLawyers();
  }, [searchQuery, lawyers]);

  const fetchLawyers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles with role 'lawyer'
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, phone, verification_status, created_at")
        .eq("role", "lawyer")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch active case counts for each lawyer
      const { data: caseCounts, error: caseError } = await supabase
        .from("cases")
        .select("assigned_lawyer_id")
        .in("status", ["lawyer_assigned", "in_progress", "work_in_progress"]);

      if (caseError) throw caseError;

      // Count active cases per lawyer
      const caseCountMap: Record<string, number> = {};
      caseCounts?.forEach((c) => {
        if (c.assigned_lawyer_id) {
          caseCountMap[c.assigned_lawyer_id] = (caseCountMap[c.assigned_lawyer_id] || 0) + 1;
        }
      });

      const lawyersWithCounts = profiles?.map((p) => ({
        ...p,
        active_cases: caseCountMap[p.user_id] || 0,
      })) || [];

      setLawyers(lawyersWithCounts);
      setFilteredLawyers(lawyersWithCounts);
    } catch (error: any) {
      console.error("Error fetching lawyers:", error);
      toast.error("Failed to load lawyers");
    } finally {
      setLoading(false);
    }
  };

  const filterLawyers = () => {
    if (!searchQuery.trim()) {
      setFilteredLawyers(lawyers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = lawyers.filter(
      (lawyer) =>
        lawyer.email?.toLowerCase().includes(query) ||
        lawyer.first_name?.toLowerCase().includes(query) ||
        lawyer.last_name?.toLowerCase().includes(query) ||
        lawyer.phone?.includes(query)
    );
    setFilteredLawyers(filtered);
  };

  const handleViewDashboard = (userId: string) => {
    navigate(`/admin/dashboards/lawyer/${userId}`);
  };

  const getVerificationBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Verified</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Not Verified</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lawyer Dashboards</h1>
        <p className="text-muted-foreground">
          Select a lawyer to view their dashboard
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">
          {filteredLawyers.length} lawyer{filteredLawyers.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : filteredLawyers.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchQuery ? "No lawyers found matching your search" : "No lawyers found"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLawyers.map((lawyer) => (
            <Card key={lawyer.user_id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {lawyer.first_name && lawyer.last_name
                        ? `${lawyer.first_name} ${lawyer.last_name}`
                        : "Unknown Name"}
                    </h3>
                    <p className="text-sm text-muted-foreground">{lawyer.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {lawyer.phone && (
                  <p className="text-sm text-muted-foreground">📞 {lawyer.phone}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {getVerificationBadge(lawyer.verification_status)}
                  <Badge variant="outline">{lawyer.active_cases} active cases</Badge>
                </div>
              </div>

              <Button
                onClick={() => handleViewDashboard(lawyer.user_id)}
                className="w-full"
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
