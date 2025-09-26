import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/dateUtils";
import { User, Search, Phone, Mail, Calendar, FileText, Users } from "lucide-react";

interface ClientData {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  profile_picture_url?: string;
  case_count?: number;
  last_login?: string;
}

export function ClientsTab() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Fetch all client profiles
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Fetch case counts for each client
      const clientsWithCounts = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { count, error: countError } = await supabase
            .from('cases')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', client.user_id);

          if (countError) {
            console.error('Error fetching case count:', countError);
            return { ...client, case_count: 0 };
          }

          return { ...client, case_count: count || 0 };
        })
      );

      setClients(clientsWithCounts);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "secondary"}>
        {isActive ? "Active" : "Inactive"}
      </Badge>
    );
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return first + last || 'CL';
  };

  const filteredClients = clients.filter(client => {
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
    const searchLower = searchTerm.toLowerCase();
    
    return (
      fullName.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      (client.phone && client.phone.toLowerCase().includes(searchLower))
    );
  });

  const clientStats = {
    total: clients.length,
    active: clients.filter(c => c.is_active).length,
    inactive: clients.filter(c => !c.is_active).length,
    withCases: clients.filter(c => (c.case_count || 0) > 0).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clients</h2>
          <p className="text-muted-foreground">Manage all client accounts</p>
        </div>
        <Button onClick={fetchClients} disabled={loading}>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Clients</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {clientStats.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Clients</CardDescription>
            <CardTitle className="text-green-600">{clientStats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive Clients</CardDescription>
            <CardTitle className="text-gray-600">{clientStats.inactive}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>With Cases</CardDescription>
            <CardTitle className="text-blue-600">{clientStats.withCases}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients ({filteredClients.length})</CardTitle>
          <CardDescription>
            Overview of all registered clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No clients found matching your search' : 'No clients found'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={client.profile_picture_url} />
                      <AvatarFallback>
                        {getInitials(client.first_name, client.last_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      {/* Header Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {client.first_name && client.last_name
                              ? `${client.first_name} ${client.last_name}`
                              : client.email}
                          </h3>
                          {getStatusBadge(client.is_active)}
                          {(client.case_count || 0) > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {client.case_count} cases
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Joined {formatDate(client.created_at)}
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          <a 
                            href={`mailto:${client.email}`}
                            className="hover:text-primary hover:underline"
                          >
                            {client.email}
                          </a>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            <a 
                              href={`tel:${client.phone}`}
                              className="hover:text-primary hover:underline"
                            >
                              {client.phone}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            ID: {client.user_id.substring(0, 8)}...
                          </span>
                          {client.last_login && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Last login: {formatDate(client.last_login)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}