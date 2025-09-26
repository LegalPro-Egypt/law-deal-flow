import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/dateUtils";
import { Mail, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter } from "lucide-react";

interface SupportTicket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  source: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  admin_notes?: string;
  metadata?: any;
}

export function SupportTicketsTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSupportTickets();
  }, []);

  const fetchSupportTickets = async () => {
    try {
      setLoading(true);
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(ticketsData || []);
    } catch (error: any) {
      console.error('Error fetching support tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      setUpdating(true);
      const updateData: any = { status, updated_at: new Date().toISOString() };
      
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      await fetchSupportTickets();
      toast({
        title: "Success",
        description: "Ticket status updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateAdminNotes = async (ticketId: string, notes: string) => {
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('support_tickets')
        .update({ admin_notes: notes, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      await fetchSupportTickets();
      setAdminNotes('');
      toast({
        title: "Success",
        description: "Admin notes updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating admin notes:', error);
      toast({
        title: "Error",
        description: "Failed to update admin notes",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { variant: 'destructive', icon: AlertCircle },
      in_progress: { variant: 'default', icon: Clock },
      resolved: { variant: 'default', icon: CheckCircle },
      closed: { variant: 'secondary', icon: XCircle },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { variant: 'secondary' },
      medium: { variant: 'default' },
      high: { variant: 'destructive' },
      urgent: { variant: 'destructive' },
    } as const;

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;

    return (
      <Badge variant={config.variant as any}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const openTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.admin_notes || '');
    setShowTicketDetails(true);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
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
          <h2 className="text-2xl font-bold">Support Tickets</h2>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
        <Button onClick={fetchSupportTickets} disabled={loading}>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tickets</CardDescription>
            <CardTitle>{ticketStats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open</CardDescription>
            <CardTitle className="text-red-600">{ticketStats.open}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-yellow-600">{ticketStats.in_progress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved</CardDescription>
            <CardTitle className="text-green-600">{ticketStats.resolved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Urgent</CardDescription>
            <CardTitle className="text-red-800">{ticketStats.urgent}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets by name, email, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets ({filteredTickets.length})</CardTitle>
          <CardDescription>
            Click on any ticket to view details and manage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No support tickets found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => openTicketDetails(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{ticket.subject}</h3>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {ticket.name} ({ticket.email})
                          </span>
                          <span>Created: {formatDate(ticket.created_at)}</span>
                          {ticket.resolved_at && (
                            <span>Resolved: {formatDate(ticket.resolved_at)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog open={showTicketDetails} onOpenChange={setShowTicketDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Support ticket from {selectedTicket?.name} • {selectedTicket?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6">
              {/* Status and Priority Controls */}
              <div className="flex gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => updateTicketStatus(selectedTicket.id, value)}
                    disabled={updating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
              </div>

              {/* Ticket Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Customer Message</label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(selectedTicket.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">Source:</span> {selectedTicket.source}
                  </div>
                  {selectedTicket.resolved_at && (
                    <div>
                      <span className="font-medium">Resolved:</span> {formatDate(selectedTicket.resolved_at)}
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Notes Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this ticket..."
                  className="min-h-24"
                />
                {adminNotes !== (selectedTicket.admin_notes || '') && (
                  <Button
                    onClick={() => updateAdminNotes(selectedTicket.id, adminNotes)}
                    disabled={updating}
                    size="sm"
                  >
                    Save Notes
                  </Button>
                )}
              </div>

              {/* Action Note */}
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p className="text-blue-800">
                  <strong>Note:</strong> To respond to this ticket, send your reply to{" "}
                  <a href={`mailto:${selectedTicket.email}?subject=Re: ${selectedTicket.subject}`} className="underline">
                    {selectedTicket.email}
                  </a>{" "}
                  from support@egyptlegalpro.com
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}