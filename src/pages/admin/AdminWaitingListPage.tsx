import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Search, Mail, Globe } from "lucide-react";

interface EmailSignup {
  id: string;
  email: string;
  source: string;
  created_at: string;
  notified: boolean;
  metadata: any;
  user_agent?: string;
  ip_address?: string;
}

export default function AdminWaitingListPage() {
  const { toast } = useToast();
  const [emailSignups, setEmailSignups] = useState<EmailSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchEmailSignups();
  }, []);

  const fetchEmailSignups = async () => {
    try {
      const { data: signups, error } = await supabase
        .from('email_signups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailSignups(signups || []);
    } catch (error: any) {
      console.error('Error fetching email signups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email signups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsNotified = async (signupId: string) => {
    try {
      const { error } = await supabase
        .from('email_signups')
        .update({ notified: true })
        .eq('id', signupId);

      if (error) throw error;

      setEmailSignups(prev => prev.map(signup => 
        signup.id === signupId ? { ...signup, notified: true } : signup
      ));

      toast({
        title: "Success",
        description: "Marked as notified",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update notification status",
        variant: "destructive",
      });
    }
  };

  const filteredSignups = emailSignups.filter(signup => {
    const searchLower = searchTerm.toLowerCase();
    return (
      signup.email.toLowerCase().includes(searchLower) ||
      signup.source.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: emailSignups.length,
    notified: emailSignups.filter(s => s.notified).length,
    pending: emailSignups.filter(s => !s.notified).length,
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Email Waiting List</h1>
          <p className="text-sm text-muted-foreground">
            Manage users who signed up for early access notifications
          </p>
        </div>
        <Button onClick={fetchEmailSignups} variant="outline" className="w-fit">
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Total Signups</CardTitle>
            <Mail className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Pending Notifications</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Notified</CardTitle>
            <Badge variant="secondary" className="text-xs">{stats.notified}</Badge>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold">{stats.notified}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 w-full">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Badge variant="secondary" className="w-fit">
          {filteredSignups.length} signup{filteredSignups.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="w-full overflow-hidden">
        {filteredSignups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Email Signups</h3>
              <p className="text-muted-foreground text-center">
                {searchTerm ? "No signups match your search criteria." : "No users have signed up for the waiting list yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredSignups.map((signup) => (
              <Card key={signup.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base md:text-lg break-all">{signup.email}</CardTitle>
                      <Badge variant={signup.notified ? "secondary" : "destructive"}>
                        {signup.notified ? "Notified" : "Pending"}
                      </Badge>
                      <Badge variant="outline">{signup.source}</Badge>
                    </div>
                    {!signup.notified && (
                      <Button
                        size="sm"
                        onClick={() => markAsNotified(signup.id)}
                        className="w-full sm:w-auto"
                      >
                        Mark as Notified
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    Signed up: {new Date(signup.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                {(signup.user_agent || signup.ip_address || Object.keys(signup.metadata || {}).length > 0) && (
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {signup.ip_address && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="break-all">IP: {signup.ip_address}</span>
                        </div>
                      )}
                      {signup.user_agent && (
                        <div className="text-xs">
                          <span className="font-medium">User Agent:</span> 
                          <span className="break-all ml-1">{signup.user_agent}</span>
                        </div>
                      )}
                      {signup.metadata && Object.keys(signup.metadata).length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium">Metadata:</span> 
                          <span className="break-all ml-1">{JSON.stringify(signup.metadata)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}