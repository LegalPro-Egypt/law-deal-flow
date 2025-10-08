import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, User } from "lucide-react";
import { toast } from "sonner";

interface ClientData {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  case_count: number;
}

export default function AdminClientDashboardsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles with role 'client'
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, phone, created_at")
        .eq("role", "client")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch case counts for each client
      const { data: caseCounts, error: caseError } = await supabase
        .from("cases")
        .select("user_id");

      if (caseError) throw caseError;

      // Count cases per user
      const caseCountMap: Record<string, number> = {};
      caseCounts?.forEach((c) => {
        caseCountMap[c.user_id] = (caseCountMap[c.user_id] || 0) + 1;
      });

      const clientsWithCounts = profiles?.map((p) => ({
        ...p,
        case_count: caseCountMap[p.user_id] || 0,
      })) || [];

      setClients(clientsWithCounts);
      setFilteredClients(clientsWithCounts);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(
      (client) =>
        client.email?.toLowerCase().includes(query) ||
        client.first_name?.toLowerCase().includes(query) ||
        client.last_name?.toLowerCase().includes(query) ||
        client.phone?.includes(query)
    );
    setFilteredClients(filtered);
  };

  const handleViewDashboard = (userId: string) => {
    navigate(`/admin/dashboards/client/${userId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Client Dashboards</h1>
        <p className="text-muted-foreground">
          Select a client to view their dashboard
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
          {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""}
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
      ) : filteredClients.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchQuery ? "No clients found matching your search" : "No clients found"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.user_id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {client.first_name && client.last_name
                        ? `${client.first_name} ${client.last_name}`
                        : "Unknown Name"}
                    </h3>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {client.phone && (
                  <p className="text-sm text-muted-foreground">📞 {client.phone}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{client.case_count} cases</Badge>
                </div>
              </div>

              <Button
                onClick={() => handleViewDashboard(client.user_id)}
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
