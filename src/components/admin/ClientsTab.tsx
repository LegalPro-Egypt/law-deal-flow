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
     <div className="space-y-6 max-w-full overflow-hidden px-1 sm:px-0">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
         <div className="min-w-0">
           <h2 className="text-xl sm:text-2xl font-bold truncate">Clients</h2>
           <p className="text-sm text-muted-foreground">Manage all client accounts</p>
         </div>
         <Button onClick={fetchClients} disabled={loading} size="sm" className="self-start sm:self-auto">
           Refresh
         </Button>
       </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
       <div className="relative px-0">
         <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
         <Input
           placeholder="Search clients..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="pl-10 text-sm"
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
            <div className="space-y-2">
              {filteredClients.map((client) => (
                 <div
                   key={client.id}
                   className="p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                 >
                   <div className="flex items-start gap-2 sm:gap-3">
                     <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                       <AvatarImage src={client.profile_picture_url} />
                       <AvatarFallback className="text-xs">
                         {getInitials(client.first_name, client.last_name)}
                       </AvatarFallback>
                     </Avatar>

                     <div className="flex-1 min-w-0 space-y-1">
                       {/* Header Row - Mobile Friendly */}
                       <div className="space-y-1">
                         <div className="flex items-center gap-2 min-w-0">
                           <h3 className="font-medium text-sm truncate flex-1">
                             {client.first_name && client.last_name
                               ? `${client.first_name} ${client.last_name}`
                               : client.email}
                           </h3>
                           <div className="flex items-center gap-1 flex-shrink-0">
                             {getStatusBadge(client.is_active)}
                             {(client.case_count || 0) > 0 && (
                               <Badge variant="outline" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
                                 <FileText className="w-3 h-3" />
                                 {client.case_count}
                               </Badge>
                             )}
                           </div>
                         </div>
                         
                         {/* Date - Mobile: below name, Desktop: separate line */}
                         <div className="text-xs text-muted-foreground">
                           <span className="flex items-center gap-1">
                             <Calendar className="w-3 h-3" />
                             Joined {formatDate(client.created_at)}
                           </span>
                         </div>
                       </div>

                       {/* Contact Info - Stack on mobile */}
                       <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-4 text-xs text-muted-foreground">
                         <div className="flex items-center gap-1 min-w-0">
                           <Mail className="w-3 h-3 flex-shrink-0" />
                           <a 
                             href={`mailto:${client.email}`}
                             className="hover:text-primary hover:underline truncate"
                           >
                             {client.email}
                           </a>
                         </div>
                         {client.phone && (
                           <div className="flex items-center gap-1">
                             <Phone className="w-3 h-3 flex-shrink-0" />
                             <a 
                               href={`tel:${client.phone}`}
                               className="hover:text-primary hover:underline"
                             >
                               {client.phone}
                             </a>
                           </div>
                         )}
                       </div>

                       {/* Additional Info - Stack on mobile */}
                       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-xs text-muted-foreground">
                         <span className="flex items-center gap-1 truncate">
                           <User className="w-3 h-3 flex-shrink-0" />
                           <span className="truncate">ID: {client.user_id.substring(0, 8)}...</span>
                         </span>
                         {client.last_login && (
                           <span className="flex items-center gap-1">
                             <Calendar className="w-3 h-3 flex-shrink-0" />
                             <span>Last: {formatDate(client.last_login)}</span>
                           </span>
                         )}
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